import { randomUUID } from 'node:crypto';
import { db } from '../prisma/db.ts';

export interface AnalysisRecord {
  id: string;
  status: string;
  inputMode: string;
  queryText: string;
  detectedTask?: string | null;
  answerText?: string | null;
  confidence?: number | null;
  reportUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  userId?: string | null;
  images?: InputImageRecord[];
  executionSteps?: ExecutionStepRecord[];
  evidence?: EvidenceRecord[];
}

export interface InputImageRecord {
  id: string;
  analysisId: string;
  role: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  bands?: number | null;
  acquisitionDate?: Date | null;
  crs?: string | null;
  metadataJson?: any;
}

export interface ExecutionStepRecord {
  id: string;
  analysisId: string;
  toolId: string;
  stage: string;
  status: string;
  parametersJson?: any;
  outputSummaryJson?: any;
  confidence?: number | null;
  startedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
}

export interface EvidenceRecord {
  id: string;
  analysisId: string;
  type: string;
  label: string;
  storagePath?: string | null;
  score?: number | null;
  geometryJson?: any;
  metadataJson?: any;
}

export interface IPersistenceStore {
  createAnalysis(data: Partial<AnalysisRecord> & { id: string; status: string; inputMode: string; queryText: string }): Promise<AnalysisRecord>;
  updateAnalysis(id: string, data: Partial<AnalysisRecord>): Promise<AnalysisRecord>;
  getAnalysis(id: string): Promise<AnalysisRecord | null>;
  createInputImage(data: InputImageRecord): Promise<InputImageRecord>;
  listInputImages(analysisId: string): Promise<InputImageRecord[]>;
  createExecutionStep(data: ExecutionStepRecord): Promise<ExecutionStepRecord>;
  listExecutionSteps(analysisId: string): Promise<ExecutionStepRecord[]>;
  createEvidence(data: EvidenceRecord): Promise<EvidenceRecord>;
  listEvidence(analysisId: string): Promise<EvidenceRecord[]>;
}

/**
 * PrismaStore: Production persistence store using Prisma ORM Postgres runtime.
 */
export class PrismaStore implements IPersistenceStore {
  async createAnalysis(data: Partial<AnalysisRecord> & { id: string; status: string; inputMode: string; queryText: string }): Promise<AnalysisRecord> {
    const record = {
      id: data.id,
      status: data.status,
      inputMode: data.inputMode,
      queryText: data.queryText,
      userId: data.userId || null,
      createdAt: data.createdAt || new Date(),
    };
    return (await db.orm.public.Analysis.create(record)) as AnalysisRecord;
  }

  async updateAnalysis(id: string, data: Partial<AnalysisRecord>): Promise<AnalysisRecord> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.detectedTask !== undefined) updateData.detectedTask = data.detectedTask;
    if (data.answerText !== undefined) updateData.answerText = data.answerText;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.reportUrl !== undefined) updateData.reportUrl = data.reportUrl;
    if (data.errorCode !== undefined) updateData.errorCode = data.errorCode;
    if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    await db.orm.public.Analysis.where({ id }).update(updateData);
    return (await db.orm.public.Analysis.first({ id })) as AnalysisRecord;
  }

  async getAnalysis(id: string): Promise<AnalysisRecord | null> {
    return (await db.orm.public.Analysis.first({ id })) as AnalysisRecord | null;
  }

  async createInputImage(data: InputImageRecord): Promise<InputImageRecord> {
    return (await db.orm.public.InputImage.create(data)) as InputImageRecord;
  }

  async listInputImages(analysisId: string): Promise<InputImageRecord[]> {
    return (await db.orm.public.InputImage.where({ analysisId }).all()) as InputImageRecord[];
  }

  async createExecutionStep(data: ExecutionStepRecord): Promise<ExecutionStepRecord> {
    return (await db.orm.public.ExecutionStep.create(data)) as ExecutionStepRecord;
  }

  async listExecutionSteps(analysisId: string): Promise<ExecutionStepRecord[]> {
    return (await db.orm.public.ExecutionStep.where({ analysisId }).all()) as ExecutionStepRecord[];
  }

  async createEvidence(data: EvidenceRecord): Promise<EvidenceRecord> {
    return (await db.orm.public.Evidence.create(data)) as EvidenceRecord;
  }

  async listEvidence(analysisId: string): Promise<EvidenceRecord[]> {
    return (await db.orm.public.Evidence.where({ analysisId }).all()) as EvidenceRecord[];
  }
}

/**
 * MemoryStore: In-memory persistence store for isolated testing or offline demo.
 */
export class MemoryStore implements IPersistenceStore {
  analyses = new Map<string, AnalysisRecord>();
  inputImages: InputImageRecord[] = [];
  executionSteps: ExecutionStepRecord[] = [];
  evidenceList: EvidenceRecord[] = [];

  async createAnalysis(data: Partial<AnalysisRecord> & { id: string; status: string; inputMode: string; queryText: string }): Promise<AnalysisRecord> {
    const record: AnalysisRecord = {
      id: data.id,
      status: data.status,
      inputMode: data.inputMode,
      queryText: data.queryText,
      userId: data.userId || null,
      detectedTask: data.detectedTask || null,
      answerText: data.answerText || null,
      confidence: data.confidence ?? null,
      reportUrl: data.reportUrl || null,
      errorCode: data.errorCode || null,
      errorMessage: data.errorMessage || null,
      createdAt: data.createdAt || new Date(),
      completedAt: data.completedAt || null,
    };
    this.analyses.set(record.id, record);
    return record;
  }

  async updateAnalysis(id: string, data: Partial<AnalysisRecord>): Promise<AnalysisRecord> {
    const existing = this.analyses.get(id);
    if (!existing) {
      throw new Error(`Analysis ${id} not found`);
    }
    const updated = { ...existing, ...data };
    this.analyses.set(id, updated);
    return updated;
  }

  async getAnalysis(id: string): Promise<AnalysisRecord | null> {
    const analysis = this.analyses.get(id);
    if (!analysis) return null;
    return {
      ...analysis,
      images: this.inputImages.filter((img) => img.analysisId === id),
      executionSteps: this.executionSteps.filter((s) => s.analysisId === id),
      evidence: this.evidenceList.filter((e) => e.analysisId === id),
    };
  }

  async createInputImage(data: InputImageRecord): Promise<InputImageRecord> {
    this.inputImages.push(data);
    return data;
  }

  async listInputImages(analysisId: string): Promise<InputImageRecord[]> {
    return this.inputImages.filter((img) => img.analysisId === analysisId);
  }

  async createExecutionStep(data: ExecutionStepRecord): Promise<ExecutionStepRecord> {
    this.executionSteps.push(data);
    return data;
  }

  async listExecutionSteps(analysisId: string): Promise<ExecutionStepRecord[]> {
    return this.executionSteps.filter((s) => s.analysisId === analysisId);
  }

  async createEvidence(data: EvidenceRecord): Promise<EvidenceRecord> {
    this.evidenceList.push(data);
    return data;
  }

  async listEvidence(analysisId: string): Promise<EvidenceRecord[]> {
    return this.evidenceList.filter((e) => e.analysisId === analysisId);
  }

  clear() {
    this.analyses.clear();
    this.inputImages = [];
    this.executionSteps = [];
    this.evidenceList = [];
  }
}

// Active store singleton
let activeStore: IPersistenceStore | null = null;

export function getPersistenceStore(): IPersistenceStore {
  if (activeStore) return activeStore;
  if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
    activeStore = new PrismaStore();
  } else {
    activeStore = new MemoryStore();
  }
  return activeStore;
}

export function setPersistenceStore(store: IPersistenceStore | null) {
  activeStore = store;
}

// ============================================================================
// Domain Service Methods for Unified Analyze Persistence
// ============================================================================

export async function createAnalysisRecord(params: {
  id?: string;
  inputMode: string;
  queryText: string;
  userId?: string | null;
}): Promise<AnalysisRecord> {
  const store = getPersistenceStore();
  const id = params.id || randomUUID();
  return store.createAnalysis({
    id,
    status: 'running',
    inputMode: params.inputMode,
    queryText: params.queryText,
    userId: params.userId || null,
    createdAt: new Date(),
  });
}

export async function recordInputImage(params: {
  id?: string;
  analysisId: string;
  role: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  bands?: number | null;
  acquisitionDate?: Date | null;
  crs?: string | null;
  metadataJson?: any;
}): Promise<InputImageRecord> {
  const store = getPersistenceStore();
  return store.createInputImage({
    id: params.id || randomUUID(),
    analysisId: params.analysisId,
    role: params.role,
    storagePath: params.storagePath,
    originalFileName: params.originalFileName,
    mimeType: params.mimeType,
    width: params.width ?? null,
    height: params.height ?? null,
    bands: params.bands ?? null,
    acquisitionDate: params.acquisitionDate ?? null,
    crs: params.crs ?? null,
    metadataJson: params.metadataJson ?? null,
  });
}

export async function recordExecutionSteps(
  analysisId: string,
  stages: Array<{ stage: string; status: string; timestamp?: number }>,
  tools?: Array<{ id: string; status: string }>,
  confidence?: number | null,
  parameters?: any
): Promise<ExecutionStepRecord[]> {
  const store = getPersistenceStore();
  const results: ExecutionStepRecord[] = [];
  const toolId = tools && tools.length > 0 ? tools[0].id : 'ml_orchestration';

  for (const stage of stages) {
    const startedAt = stage.timestamp ? new Date(stage.timestamp * 1000) : new Date();
    const step = await store.createExecutionStep({
      id: randomUUID(),
      analysisId,
      toolId,
      stage: stage.stage,
      status: stage.status || 'completed',
      parametersJson: parameters || null,
      outputSummaryJson: null,
      confidence: confidence ?? null,
      startedAt,
      completedAt: new Date(),
      errorMessage: null,
    });
    results.push(step);
  }

  return results;
}

export async function recordEvidenceItems(
  analysisId: string,
  evidenceItems: Array<{ type: string; label: string; url?: string; score: number; geometryJson?: any; metadataJson?: any }>
): Promise<EvidenceRecord[]> {
  const store = getPersistenceStore();
  const results: EvidenceRecord[] = [];

  for (const item of evidenceItems) {
    const ev = await store.createEvidence({
      id: randomUUID(),
      analysisId,
      type: item.type,
      label: item.label,
      storagePath: item.url || null,
      score: item.score ?? null,
      geometryJson: item.geometryJson || null,
      metadataJson: item.metadataJson || null,
    });
    results.push(ev);
  }

  return results;
}

export async function markAnalysisCompleted(
  analysisId: string,
  result: {
    detectedTask?: string | null;
    answerText?: string | null;
    confidence?: number | null;
    reportUrl?: string | null;
  }
): Promise<AnalysisRecord> {
  const store = getPersistenceStore();
  return store.updateAnalysis(analysisId, {
    status: 'completed',
    detectedTask: result.detectedTask ?? null,
    answerText: result.answerText ?? null,
    confidence: result.confidence ?? null,
    reportUrl: result.reportUrl ?? null,
    completedAt: new Date(),
  });
}

export async function markAnalysisFailed(
  analysisId: string,
  error: {
    errorCode: string;
    errorMessage: string;
  }
): Promise<AnalysisRecord> {
  const store = getPersistenceStore();
  return store.updateAnalysis(analysisId, {
    status: 'failed',
    errorCode: error.errorCode,
    errorMessage: error.errorMessage,
    completedAt: new Date(),
  });
}

export async function getAnalysisWithRelations(analysisId: string): Promise<AnalysisRecord | null> {
  const store = getPersistenceStore();
  const analysis = await store.getAnalysis(analysisId);
  if (!analysis) return null;

  const [images, executionSteps, evidence] = await Promise.all([
    store.listInputImages(analysisId),
    store.listExecutionSteps(analysisId),
    store.listEvidence(analysisId),
  ]);

  return {
    ...analysis,
    images,
    executionSteps,
    evidence,
  };
}
