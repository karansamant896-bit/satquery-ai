export type AnalysisMode = 'single' | 'optical_sar' | 'bi_temporal';
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  source: 'DEMO' | 'MODEL' | 'DATASET';
}

export interface ExecutionStep {
  name: string;
  status: 'completed' | 'processing' | 'pending';
  detail?: string;
  durationMs?: number;
}

export interface AnalyzeResponse {
  analysisId: string;
  status: AnalysisStatus;
  task: string;
  answer: string;
  confidence: number | null;
  evidence: EvidenceItem[];
  executionTrace: ExecutionStep[];
  reportUrl?: string | null;
  demo: boolean;
  createdAt: string;
}

export interface AnalyzeRequest {
  query: string;
  mode: AnalysisMode;
  imageA: File;
  imageB?: File;
}

export const MODE_REQUIREMENTS: Record<AnalysisMode, { label: string; description: string; requiresSecondImage: boolean }> = {
  single: {
    label: 'Single Image',
    description: 'Ask questions about one uploaded observation.',
    requiresSecondImage: false,
  },
  optical_sar: {
    label: 'Optical + SAR',
    description: 'Compare complementary optical and radar observations.',
    requiresSecondImage: true,
  },
  bi_temporal: {
    label: 'Bi-temporal',
    description: 'Compare two observations captured at different times.',
    requiresSecondImage: true,
  },
};

export const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/tiff', 'image/tif'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function validateClientInput(mode: AnalysisMode, query: string, imageA?: File, imageB?: File) {
  const errors: string[] = [];
  if (!query.trim()) errors.push('Enter a natural-language query.');
  if (!imageA) errors.push('Upload the primary image.');
  if (imageA) {
    if (!SUPPORTED_TYPES.includes(imageA.type) && !/\.tif{1,2}$/i.test(imageA.name)) errors.push(`${imageA.name}: unsupported file type.`);
    if (imageA.size > MAX_FILE_SIZE) errors.push(`${imageA.name}: file exceeds the 20 MB limit.`);
  }
  if (MODE_REQUIREMENTS[mode].requiresSecondImage && !imageB) errors.push('This mode requires a second image.');
  if (imageB) {
    if (!SUPPORTED_TYPES.includes(imageB.type) && !/\.tif{1,2}$/i.test(imageB.name)) errors.push(`${imageB.name}: unsupported file type.`);
    if (imageB.size > MAX_FILE_SIZE) errors.push(`${imageB.name}: file exceeds the 20 MB limit.`);
  }
  return errors;
}

export async function analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('query', request.query);
  form.append('mode', request.mode);
  form.append('image_a', request.imageA);
  if (request.imageB) form.append('image_b', request.imageB);

  const response = await fetch('/api/analyze', { method: 'POST', body: form });
  const data = (await response.json()) as AnalyzeResponse | { detail?: string; error?: string };
  if (!response.ok) throw new Error('detail' in data && data.detail ? data.detail : 'Analysis request failed.');
  return data as AnalyzeResponse;
}
