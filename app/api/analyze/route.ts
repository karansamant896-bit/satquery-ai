import {
  MODE_REQUIREMENTS,
  MAX_FILE_SIZE,
  SUPPORTED_TYPES,
  type AnalysisMode,
  type AnalyzeResponse,
} from '../../../lib/api.ts';
import {
  createAnalysisRecord,
  recordInputImage,
  recordExecutionSteps,
  recordEvidenceItems,
  markAnalysisCompleted,
  markAnalysisFailed,
  getAnalysisWithRelations,
} from '../../../src/lib/analysisService.ts';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

export type MLForwarder = (
  query: string,
  mode: string,
  imageA: File,
  imageB?: File | null
) => Promise<{
  success: boolean;
  status: number;
  data?: any;
  error?: { code: string; message: string };
}>;

let customMlForwarder: MLForwarder | null = null;

export function setCustomMLForwarder(forwarder: MLForwarder | null) {
  customMlForwarder = forwarder;
}

/**
 * Upload image to Supabase Storage if configured
 */
async function tryUploadToStorage(storagePath: string, file: File): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { uploadImage } = await import('../../../src/lib/storage.ts');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await uploadImage(storagePath, buffer, file.type || 'application/octet-stream');
      return storagePath;
    } catch (storageErr) {
      console.warn(`[Storage Upload Warning] Could not upload to Supabase: ${storageErr}`);
    }
  }
  return storagePath;
}

export async function POST(request: Request) {
  let analysisId: string | null = null;

  try {
    const form = await request.formData();
    const query = String(form.get('query') ?? '').trim();
    const mode = String(form.get('mode') ?? '') as AnalysisMode;
    const imageA = form.get('image_a');
    const imageB = form.get('image_b');

    // 1. Input Validation
    if (!(mode in MODE_REQUIREMENTS)) {
      const msg = 'Unsupported analysis mode.';
      return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
    }
    if (!query) {
      const msg = 'Query is required.';
      return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
    }
    if (!(imageA instanceof File)) {
      const msg = 'image_a is required.';
      return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
    }
    if (MODE_REQUIREMENTS[mode].requiresSecondImage && !(imageB instanceof File)) {
      const msg = `mode ${mode} requires image_b.`;
      return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
    }

    const filesToValidate: Array<[string, File | undefined]> = [
      ['image_a', imageA],
      ['image_b', imageB instanceof File ? imageB : undefined],
    ];
    for (const [name, file] of filesToValidate) {
      if (!file) continue;
      if (file.size > MAX_FILE_SIZE) {
        const msg = `${name} exceeds the 20 MB limit.`;
        return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
      }
      if (!SUPPORTED_TYPES.includes(file.type) && !/\.tif{1,2}$/i.test(file.name)) {
        const msg = `${name} has an unsupported file type.`;
        return Response.json({ success: false, detail: msg, error: { code: 'INVALID_INPUT', message: msg } }, { status: 400 });
      }
    }

    // 2. Explicit Development Mock Fallback ONLY (never default)
    const isMockExplicitlyRequested =
      process.env.ENABLE_MOCK_FALLBACK === 'true' && String(form.get('mock') ?? '') === 'true';

    if (isMockExplicitlyRequested) {
      const now = new Date().toISOString();
      const mockResponse: AnalyzeResponse = {
        analysisId: `demo-${Date.now()}`,
        status: 'completed',
        task: mode === 'bi_temporal' ? 'change_detection' : mode === 'optical_sar' ? 'multimodal_analysis' : 'visual_question_answering',
        answer: `Demo response for “${query}”. (Explicit mock requested)`,
        confidence: 78,
        evidence: [
          { id: 'demo-1', label: 'Input validation', description: 'Required query and images accepted.', source: 'DEMO' },
        ],
        executionTrace: [
          { name: 'Request received', status: 'completed' },
          { name: 'Mock inference', status: 'completed' },
        ],
        reportUrl: null,
        demo: true,
        createdAt: now,
      };
      return Response.json(mockResponse);
    }

    // 3. Create Analysis record (status: running) in Persistence Store
    const fileA = imageA as File;
    const fileB = imageB instanceof File ? imageB : null;

    const analysis = await createAnalysisRecord({
      inputMode: mode,
      queryText: query,
    });
    analysisId = analysis.id;

    // 4. Save InputImage metadata & upload to private Supabase Storage bucket
    const roleA = mode === 'optical_sar' ? 'optical' : mode === 'bi_temporal' ? 'pre_change' : 'image_a';
    const pathA = `${analysis.id}/${roleA}_${fileA.name}`;
    await tryUploadToStorage(pathA, fileA);
    await recordInputImage({
      analysisId: analysis.id,
      role: roleA,
      storagePath: pathA,
      originalFileName: fileA.name,
      mimeType: fileA.type || 'image/png',
    });

    if (fileB) {
      const roleB = mode === 'optical_sar' ? 'sar' : mode === 'bi_temporal' ? 'post_change' : 'image_b';
      const pathB = `${analysis.id}/${roleB}_${fileB.name}`;
      await tryUploadToStorage(pathB, fileB);
      await recordInputImage({
        analysisId: analysis.id,
        role: roleB,
        storagePath: pathB,
        originalFileName: fileB.name,
        mimeType: fileB.type || 'image/png',
      });
    }

    // 5. Call ML service (customMlForwarder if in test, else FastAPI /internal/analyze)
    let mlData: any;

    if (customMlForwarder) {
      const mlResponse = await customMlForwarder(query, mode, fileA, fileB);
      if (!mlResponse.success || !mlResponse.data) {
        const errCode = mlResponse.error?.code || 'INFERENCE_FAILED';
        const errMsg = mlResponse.error?.message || 'ML service call failed';
        await markAnalysisFailed(analysis.id, { errorCode: errCode, errorMessage: errMsg });
        return Response.json({ success: false, detail: errMsg, error: { code: errCode, message: errMsg } }, { status: mlResponse.status || 500 });
      }
      mlData = mlResponse.data;
    } else {
      const fastApiFormData = new FormData();
      fastApiFormData.append('query', query);
      fastApiFormData.append('mode', mode);

      const bufA = await fileA.arrayBuffer();
      fastApiFormData.append('image_a', new Blob([bufA], { type: fileA.type || 'image/png' }), fileA.name);

      if (fileB) {
        const bufB = await fileB.arrayBuffer();
        fastApiFormData.append('image_b', new Blob([bufB], { type: fileB.type || 'image/png' }), fileB.name);
      }

      const endpoint = `${FASTAPI_URL}/internal/analyze`;
      let fastApiResponse: Response;
      try {
        fastApiResponse = await fetch(endpoint, {
          method: 'POST',
          body: fastApiFormData,
        });
      } catch (netErr: any) {
        const errMsg = `Failed to connect to ML service at ${endpoint}: ${netErr?.message || netErr}`;
        await markAnalysisFailed(analysis.id, {
          errorCode: 'FASTAPI_CONNECTION_ERROR',
          errorMessage: errMsg,
        });
        return Response.json(
          {
            success: false,
            detail: errMsg,
            error: { code: 'FASTAPI_CONNECTION_ERROR', message: errMsg },
          },
          { status: 502 }
        );
      }

      const responseBody = await fastApiResponse.json().catch(() => null);

      if (!fastApiResponse.ok || !responseBody?.success || !responseBody?.data) {
        const errCode = responseBody?.error?.code || 'INFERENCE_FAILED';
        const errMsg =
          responseBody?.error?.message ||
          responseBody?.detail ||
          `ML service returned status ${fastApiResponse.status}`;

        await markAnalysisFailed(analysis.id, {
          errorCode: errCode,
          errorMessage: errMsg,
        });

        return Response.json(
          {
            success: false,
            detail: errMsg,
            error: { code: errCode, message: errMsg },
          },
          { status: fastApiResponse.status || 500 }
        );
      }

      mlData = responseBody.data;
    }

    // 6. Save ExecutionStep records
    if (mlData.executionTrace && Array.isArray(mlData.executionTrace.stages)) {
      await recordExecutionSteps(
        analysis.id,
        mlData.executionTrace.stages,
        mlData.executionTrace.selectedTools,
        mlData.confidence,
        mlData.executionTrace.parameters
      );
    }

    // 7. Save Evidence records
    if (Array.isArray(mlData.evidence)) {
      await recordEvidenceItems(analysis.id, mlData.evidence);
    }

    // 8. Update Analysis record (status: completed)
    await markAnalysisCompleted(analysis.id, {
      detectedTask: mlData.task,
      answerText: mlData.answer,
      confidence: mlData.confidence ?? null,
      reportUrl: mlData.reportUrl ?? null,
    });

    // 9. Format response for Frontend Workspace
    // Confidence normalized for display (0-100 if fractional, or null)
    let displayConfidence: number | null = null;
    if (typeof mlData.confidence === 'number' && !isNaN(mlData.confidence)) {
      displayConfidence = mlData.confidence <= 1 ? Math.round(mlData.confidence * 100) : Math.round(mlData.confidence);
    }

    const formattedEvidence = (mlData.evidence || []).map((item: any, idx: number) => ({
      id: `ev-${idx + 1}`,
      label: item.label || item.type || `Evidence ${idx + 1}`,
      description:
        item.description ||
        (item.type === 'change_map'
          ? 'Binary change map identifying temporal differences.'
          : item.score
          ? `Score: ${(item.score * 100).toFixed(1)}%`
          : `Source: ${item.type || 'Model analysis'}`),
      source: 'MODEL' as const,
      url: item.url || null,
    }));

    const formattedTrace = (mlData.executionTrace?.stages || []).map((stage: any) => ({
      name: stage.stage
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char: string) => char.toUpperCase()),
      status: 'completed' as const,
      detail: stage.status || 'completed',
      durationMs: mlData.executionTrace?.durationMs,
    }));

    const now = new Date().toISOString();
    const finalResponse = {
      success: true,
      analysisId: analysis.id,
      status: 'completed' as const,
      task: mlData.task || mode,
      answer: mlData.answer,
      confidence: displayConfidence,
      evidence: formattedEvidence,
      executionTrace: formattedTrace,
      reportUrl: mlData.reportUrl || null,
      demo: false, // REAL LIVE PIPELINE!
      createdAt: now,
      data: {
        analysisId: analysis.id,
        status: 'completed',
        task: mlData.task || mode,
        answer: mlData.answer,
        confidence: displayConfidence !== null ? displayConfidence / 100 : null,
        evidence: mlData.evidence || formattedEvidence,
        executionTrace: mlData.executionTrace || {
          inputMode: mode,
          stages: formattedTrace,
        },
        reportUrl: mlData.reportUrl || null,
      },
    };

    return Response.json(finalResponse);
  } catch (err: any) {
    console.error('[Analyze Route Error]', err);

    if (analysisId) {
      try {
        await markAnalysisFailed(analysisId, {
          errorCode: 'INTERNAL_ERROR',
          errorMessage: err?.message || 'Unexpected server error',
        });
      } catch (dbErr) {
        console.error('[Failed to update analysis failure state]', dbErr);
      }
    }

    return Response.json(
      {
        detail: err?.message || 'Invalid analysis request.',
        error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze?id=<analysisId>
 * Query persisted analysis and its relations (InputImage, ExecutionStep, Evidence).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { detail: 'Missing required query parameter: id' },
        { status: 400 }
      );
    }

    const record = await getAnalysisWithRelations(id);

    if (!record) {
      return Response.json(
        { detail: `Analysis ${id} not found.` },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: record,
    });
  } catch (err: any) {
    return Response.json(
      { detail: err?.message || 'Failed to retrieve analysis record.' },
      { status: 500 }
    );
  }
}

