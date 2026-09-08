import { NextResponse } from 'next/server';
import { MODE_REQUIREMENTS, MAX_FILE_SIZE, SUPPORTED_TYPES, type AnalysisMode, type AnalyzeResponse } from '../../../lib/api';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const query = String(form.get('query') ?? '').trim();
    const mode = String(form.get('mode') ?? '') as AnalysisMode;
    const imageA = form.get('image_a');
    const imageB = form.get('image_b');

    if (!(mode in MODE_REQUIREMENTS)) return NextResponse.json({ detail: 'Unsupported analysis mode.' }, { status: 400 });
    if (!query) return NextResponse.json({ detail: 'Query is required.' }, { status: 400 });
    if (!(imageA instanceof File)) return NextResponse.json({ detail: 'image_a is required.' }, { status: 400 });
    if (MODE_REQUIREMENTS[mode].requiresSecondImage && !(imageB instanceof File)) return NextResponse.json({ detail: 'image_b is required for this mode.' }, { status: 400 });

    const filesToValidate: Array<[string, File | undefined]> = [
      ['image_a', imageA],
      ['image_b', imageB instanceof File ? imageB : undefined],
    ];
    for (const [name, file] of filesToValidate) {
      if (!file) continue;
      if (file.size > MAX_FILE_SIZE) return NextResponse.json({ detail: `${name} exceeds the 20 MB limit.` }, { status: 400 });
      if (!SUPPORTED_TYPES.includes(file.type) && !/\.tif{1,2}$/i.test(file.name)) return NextResponse.json({ detail: `${name} has an unsupported file type.` }, { status: 400 });
    }

    // Integration seam: when the ML service is ready, this server-side route is the place to proxy to FastAPI.
    // The current milestone intentionally returns a clearly-labelled demo response.
    const now = new Date().toISOString();
    const response: AnalyzeResponse = {
      analysisId: `demo-${Date.now()}`,
      status: 'completed',
      task: mode === 'bi_temporal' ? 'change_detection' : mode === 'optical_sar' ? 'multimodal_analysis' : 'visual_question_answering',
      answer: `Demo response for “${query}”. The request passed frontend/server validation and is ready for real ML inference. No satellite claim is being made by this mock result.`,
      confidence: 78,
      evidence: [
        { id: 'demo-1', label: 'Input validation', description: 'Required query, mode and supported image inputs were accepted.', source: 'DEMO' },
        { id: 'demo-2', label: 'Execution contract', description: 'The result shape is prepared for answer, confidence, evidence and trace data.', source: 'DEMO' },
      ],
      executionTrace: [
        { name: 'Request received', status: 'completed', durationMs: 10 },
        { name: 'Input validated', status: 'completed', durationMs: 8 },
        { name: 'Task selected', status: 'completed', durationMs: 5 },
        { name: 'Model selected', status: 'completed', detail: 'MODEL PENDING — DEMO ROUTE' },
        { name: 'Inference', status: 'completed', detail: 'MOCK / DEMO — REAL ML NOT INTEGRATED' },
        { name: 'Result ready', status: 'completed' },
      ],
      reportUrl: null,
      demo: true,
      createdAt: now,
    };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ detail: 'Invalid analysis request.' }, { status: 400 });
  }
}
