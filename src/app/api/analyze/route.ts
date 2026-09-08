import {
  createAnalysisRecord,
  recordInputImage,
  recordExecutionSteps,
  recordEvidenceItems,
  markAnalysisCompleted,
  markAnalysisFailed,
} from '../../../lib/analysisService.ts';

const ALLOWED_MODES = new Set(['single', 'optical_sar', 'bi_temporal']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff']);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

/**
 * Default forwarder calling FastAPI /internal/analyze
 */
export const defaultFastApiForwarder: MLForwarder = async (query, mode, imageA, imageB) => {
  const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
  const endpoint = `${fastApiUrl}/internal/analyze`;

  const mlFormData = new FormData();
  mlFormData.append('query', query);
  mlFormData.append('mode', mode);
  mlFormData.append('image_a', imageA, imageA.name);
  if (imageB) {
    mlFormData.append('image_b', imageB, imageB.name);
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: mlFormData,
    });

    const body = await res.json();
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: body?.error || {
          code: res.status === 400 ? 'INVALID_INPUT' : 'INFERENCE_FAILED',
          message: body?.detail || res.statusText || 'ML service call failed',
        },
      };
    }

    return {
      success: true,
      status: 200,
      data: body.data,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 502,
      error: {
        code: 'INFERENCE_FAILED',
        message: `Failed to connect to ML service: ${err?.message || String(err)}`,
      },
    };
  }
};

let customMlForwarder: MLForwarder | null = null;

export function setCustomMLForwarder(forwarder: MLForwarder | null) {
  customMlForwarder = forwarder;
}

function validateFile(file: File, fieldName: string): string | null {
  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return `Missing required file: ${fieldName}`;
  }

  const name = file.name || '';
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `Unsupported format for ${fieldName}: ${ext}. Only PNG, JPEG, and TIFF are supported.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File ${fieldName} exceeds the maximum allowed size of 50MB.`;
  }

  return null;
}

/**
 * Upload image to Supabase Storage if configured
 */
async function tryUploadToStorage(storagePath: string, file: File): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { uploadImage } = await import('../../../lib/storage.ts');
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

/**
 * POST /api/analyze
 * Unified analyze flow with complete database persistence.
 */
export async function POST(req: Request): Promise<Response> {
  let analysisId: string | null = null;

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Content-Type must be multipart/form-data',
          },
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const query = formData.get('query');
    const mode = formData.get('mode');
    const imageA = formData.get('image_a');
    const imageB = formData.get('image_b');

    // 1. Validation
    if (!query || typeof query !== 'string' || !query.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Query cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    if (!mode || typeof mode !== 'string' || !ALLOWED_MODES.has(mode)) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Unsupported mode: ${mode}`,
          },
        },
        { status: 400 }
      );
    }

    const errA = validateFile(imageA as File, 'image_a');
    if (errA) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: errA,
          },
        },
        { status: 400 }
      );
    }

    if (mode === 'optical_sar' || mode === 'bi_temporal') {
      if (!imageB) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: `mode ${mode} requires image_b`,
            },
          },
          { status: 400 }
        );
      }
      const errB = validateFile(imageB as File, 'image_b');
      if (errB) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: errB,
            },
          },
          { status: 400 }
        );
      }
    }

    const cleanQuery = query.trim();
    const fileA = imageA as File;
    const fileB = imageB ? (imageB as File) : null;

    // 2. Create Analysis record (status: running)
    const analysis = await createAnalysisRecord({
      inputMode: mode,
      queryText: cleanQuery,
    });
    analysisId = analysis.id;

    // 3. Upload & Save InputImage records
    const roleA = mode === 'optical_sar' ? 'optical' : mode === 'bi_temporal' ? 'pre_change' : 'image_a';
    const pathA = `${analysis.id}/${roleA}_${fileA.name}`;
    await tryUploadToStorage(pathA, fileA);
    await recordInputImage({
      analysisId: analysis.id,
      role: roleA,
      storagePath: pathA,
      originalFileName: fileA.name,
      mimeType: fileA.type || 'application/octet-stream',
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
        mimeType: fileB.type || 'application/octet-stream',
      });
    }

    // 4. Forward to ML Service (GeoChat / BIT-CD / CROMA)
    const forwarder = customMlForwarder || defaultFastApiForwarder;
    const mlResponse = await forwarder(cleanQuery, mode, fileA, fileB);

    if (!mlResponse.success || !mlResponse.data) {
      const errCode = mlResponse.error?.code || 'INFERENCE_FAILED';
      const errMsg = mlResponse.error?.message || 'ML service inference failed';

      await markAnalysisFailed(analysis.id, {
        errorCode: errCode,
        errorMessage: errMsg,
      });

      return Response.json(
        {
          success: false,
          error: {
            code: errCode,
            message: errMsg,
          },
        },
        { status: mlResponse.status || 500 }
      );
    }

    const data = mlResponse.data;

    // 5. Save ExecutionStep records
    if (data.executionTrace && Array.isArray(data.executionTrace.stages)) {
      await recordExecutionSteps(
        analysis.id,
        data.executionTrace.stages,
        data.executionTrace.selectedTools,
        data.confidence,
        data.executionTrace.parameters
      );
    }

    // 6. Save Evidence records
    if (Array.isArray(data.evidence)) {
      await recordEvidenceItems(analysis.id, data.evidence);
    }

    // 7. Update Analysis record (status: completed)
    await markAnalysisCompleted(analysis.id, {
      detectedTask: data.task,
      answerText: data.answer,
      confidence: data.confidence ?? null,
      reportUrl: data.reportUrl ?? null,
    });

    // 8. Return response with persisted analysisId
    return Response.json(
      {
        success: true,
        data: {
          analysisId: analysis.id,
          status: 'completed',
          task: data.task,
          answer: data.answer,
          confidence: data.confidence ?? null,
          evidence: data.evidence || [],
          executionTrace: data.executionTrace,
          reportUrl: data.reportUrl ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[API /api/analyze Error]', err);

    if (analysisId) {
      try {
        await markAnalysisFailed(analysisId, {
          errorCode: 'INTERNAL_ERROR',
          errorMessage: err?.message || 'Unexpected internal server error',
        });
      } catch (dbErr) {
        console.error('[Failed to update analysis failure state]', dbErr);
      }
    }

    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
