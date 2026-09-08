import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, setCustomMLForwarder } from '../src/app/api/analyze/route.ts';
import {
  getPersistenceStore,
  setPersistenceStore,
  MemoryStore,
  getAnalysisWithRelations,
} from '../src/lib/analysisService.ts';

// Helper to create a dummy File object in Node
function createTestFile(name: string, content: string = 'dummy file data', type: string = 'image/png'): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Setup and Teardown helper
function useTestMemoryStore() {
  const store = new MemoryStore();
  setPersistenceStore(store);
  return store;
}

test('M6 Persistence — Single-image VQA full lifecycle', async () => {
  const store = useTestMemoryStore();

  // Mock ML forwarder returning GeoChat VQA result
  setCustomMLForwarder(async (query, mode, imageA, imageB) => {
    assert.equal(query, 'What is shown in this satellite image?');
    assert.equal(mode, 'single');
    assert.equal(imageA.name, 'optical_sample.png');
    assert.equal(imageB, null);

    return {
      success: true,
      status: 200,
      data: {
        analysisId: 'mock-ml-id',
        status: 'completed',
        task: 'vqa',
        answer: 'The image shows an agricultural area with rectangular fields and irrigation channels.',
        confidence: 0.88,
        evidence: [
          {
            type: 'text',
            label: 'vqa_response',
            url: 'evidence/vqa_response.txt',
            score: 0.88,
          },
        ],
        executionTrace: {
          inputMode: 'single',
          selectedTools: [{ id: 'geochat_vqa', status: 'completed' }],
          stages: [
            { stage: 'request_received', status: 'completed', timestamp: 1000.0 },
            { stage: 'input_validated', status: 'completed', timestamp: 1000.1 },
            { stage: 'task_selected', status: 'completed', timestamp: 1000.2 },
            { stage: 'model_selected', status: 'completed', timestamp: 1000.3 },
            { stage: 'inference_executed', status: 'completed', timestamp: 1001.0 },
            { stage: 'result_generated', status: 'completed', timestamp: 1001.1 },
          ],
          parameters: { temperature: 0.2 },
        },
        reportUrl: null,
      },
    };
  });

  const formData = new FormData();
  formData.append('query', 'What is shown in this satellite image?');
  formData.append('mode', 'single');
  formData.append('image_a', createTestFile('optical_sample.png'));

  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: formData,
  });

  const res = await POST(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.analysisId);
  assert.equal(json.data.status, 'completed');
  assert.equal(json.data.task, 'vqa');
  assert.equal(json.data.confidence, 0.88);
  assert.equal(json.data.answer, 'The image shows an agricultural area with rectangular fields and irrigation channels.');

  // Verify Database Persistence
  const saved = await getAnalysisWithRelations(json.data.analysisId);
  assert.ok(saved, 'Analysis should exist in database');
  assert.equal(saved.status, 'completed');
  assert.equal(saved.inputMode, 'single');
  assert.equal(saved.queryText, 'What is shown in this satellite image?');
  assert.equal(saved.detectedTask, 'vqa');
  assert.equal(saved.answerText, 'The image shows an agricultural area with rectangular fields and irrigation channels.');
  assert.equal(saved.confidence, 0.88);
  assert.ok(saved.completedAt, 'completedAt must be set');

  // Verify InputImage persistence
  assert.equal(saved.images?.length, 1);
  const imgA = saved.images[0];
  assert.equal(imgA.role, 'image_a');
  assert.equal(imgA.originalFileName, 'optical_sample.png');
  assert.ok(imgA.storagePath.includes(saved.id));

  // Verify ExecutionStep persistence
  assert.ok(saved.executionSteps && saved.executionSteps.length >= 6);
  assert.equal(saved.executionSteps[0].stage, 'request_received');
  assert.equal(saved.executionSteps[0].status, 'completed');
  assert.equal(saved.executionSteps[saved.executionSteps.length - 1].stage, 'result_generated');

  // Verify Evidence persistence
  assert.equal(saved.evidence?.length, 1);
  assert.equal(saved.evidence[0].type, 'text');
  assert.equal(saved.evidence[0].label, 'vqa_response');
  assert.equal(saved.evidence[0].score, 0.88);
});

test('M6 Persistence — Bi-temporal change detection with two images', async () => {
  const store = useTestMemoryStore();

  setCustomMLForwarder(async (query, mode, imageA, imageB) => {
    assert.equal(query, 'Detect urban expansion between 2020 and 2024');
    assert.equal(mode, 'bi_temporal');
    assert.equal(imageA.name, 't0_before.png');
    assert.equal(imageB?.name, 't1_after.png');

    return {
      success: true,
      status: 200,
      data: {
        analysisId: 'mock-cd-id',
        status: 'completed',
        task: 'change_detection',
        answer: 'Significant new construction detected in the northeast sector. Changed pixels: 14.2%.',
        confidence: 0.91,
        evidence: [
          {
            type: 'change_map',
            label: 'bit_cd_binary_change',
            url: 'evidence/change_mask.png',
            score: 0.91,
          },
        ],
        executionTrace: {
          inputMode: 'bi_temporal',
          selectedTools: [{ id: 'bit_cd', status: 'completed' }],
          stages: [
            { stage: 'request_received', status: 'completed' },
            { stage: 'bi_temporal_alignment', status: 'completed' },
            { stage: 'bit_cd_inference', status: 'completed' },
            { stage: 'result_generated', status: 'completed' },
          ],
        },
        reportUrl: null,
      },
    };
  });

  const formData = new FormData();
  formData.append('query', 'Detect urban expansion between 2020 and 2024');
  formData.append('mode', 'bi_temporal');
  formData.append('image_a', createTestFile('t0_before.png'));
  formData.append('image_b', createTestFile('t1_after.png'));

  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: formData,
  });

  const res = await POST(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.task, 'change_detection');

  // Verify both images persisted
  const saved = await getAnalysisWithRelations(json.data.analysisId);
  assert.ok(saved);
  assert.equal(saved.images?.length, 2);

  const pre = saved.images.find((i) => i.role === 'pre_change');
  const post = saved.images.find((i) => i.role === 'post_change');
  assert.ok(pre, 'pre_change image must exist');
  assert.ok(post, 'post_change image must exist');
  assert.equal(pre.originalFileName, 't0_before.png');
  assert.equal(post.originalFileName, 't1_after.png');

  // Verify Evidence
  assert.equal(saved.evidence?.length, 1);
  assert.equal(saved.evidence[0].type, 'change_map');
  assert.equal(saved.evidence[0].label, 'bit_cd_binary_change');
});

test('M6 Persistence — Optical + SAR paired mode (CROMA)', async () => {
  const store = useTestMemoryStore();

  setCustomMLForwarder(async (query, mode, imageA, imageB) => {
    assert.equal(mode, 'optical_sar');
    assert.equal(imageA.name, 'sentinel2_optical.tif');
    assert.equal(imageB?.name, 'sentinel1_sar.tif');

    return {
      success: true,
      status: 200,
      data: {
        analysisId: 'mock-croma-id',
        status: 'completed',
        task: 'optical_sar_analysis',
        answer: 'Optical-SAR cross-modal alignment complete. Joint feature similarity: 0.842. Modality coherence: high.',
        confidence: null, // CROMA confidence is intentionally null
        evidence: [
          {
            type: 'image',
            label: 'croma_cross_attention',
            url: 'evidence/croma_joint.png',
            score: 0.842,
          },
        ],
        executionTrace: {
          inputMode: 'optical_sar',
          selectedTools: [{ id: 'croma', status: 'completed' }],
          stages: [
            { stage: 'request_received', status: 'completed' },
            { stage: 'optical_sar_fusion', status: 'completed' },
            { stage: 'croma_inference', status: 'completed' },
            { stage: 'result_generated', status: 'completed' },
          ],
        },
        reportUrl: null,
      },
    };
  });

  const formData = new FormData();
  formData.append('query', 'Perform multi-sensor cross analysis');
  formData.append('mode', 'optical_sar');
  formData.append('image_a', createTestFile('sentinel2_optical.tif', 'optical tif data', 'image/tiff'));
  formData.append('image_b', createTestFile('sentinel1_sar.tif', 'sar tif data', 'image/tiff'));

  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: formData,
  });

  const res = await POST(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.confidence, null);

  const saved = await getAnalysisWithRelations(json.data.analysisId);
  assert.ok(saved);
  assert.equal(saved.confidence, null);

  const opt = saved.images?.find((i) => i.role === 'optical');
  const sar = saved.images?.find((i) => i.role === 'sar');
  assert.ok(opt);
  assert.ok(sar);
});

test('M6 Persistence — Handling ML inference failure updates Analysis to failed', async () => {
  const store = useTestMemoryStore();

  setCustomMLForwarder(async () => {
    return {
      success: false,
      status: 500,
      error: {
        code: 'INFERENCE_FAILED',
        message: 'GPU CUDA Out of Memory during inference',
      },
    };
  });

  const formData = new FormData();
  formData.append('query', 'Analyze scene');
  formData.append('mode', 'single');
  formData.append('image_a', createTestFile('scene.png'));

  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: formData,
  });

  const res = await POST(req);
  assert.equal(res.status, 500);

  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, 'INFERENCE_FAILED');
  assert.ok(json.error.message.includes('CUDA Out of Memory'));

  // Verify that an Analysis record was created and its status was transitioned to 'failed'
  const allAnalyses = Array.from(store.analyses.values());
  assert.equal(allAnalyses.length, 1);
  const failedAnalysis = allAnalyses[0];
  assert.equal(failedAnalysis.status, 'failed');
  assert.equal(failedAnalysis.errorCode, 'INFERENCE_FAILED');
  assert.equal(failedAnalysis.errorMessage, 'GPU CUDA Out of Memory during inference');
  assert.ok(failedAnalysis.completedAt);
});

test('M6 Validation — Rejects invalid input requests', async () => {
  useTestMemoryStore();

  // 1. Missing query
  {
    const fd = new FormData();
    fd.append('query', '   ');
    fd.append('mode', 'single');
    fd.append('image_a', createTestFile('img.png'));
    const res = await POST(new Request('http://localhost:3000/api/analyze', { method: 'POST', body: fd }));
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'INVALID_INPUT');
  }

  // 2. Unsupported mode
  {
    const fd = new FormData();
    fd.append('query', 'Test query');
    fd.append('mode', 'hyperspectral_3d');
    fd.append('image_a', createTestFile('img.png'));
    const res = await POST(new Request('http://localhost:3000/api/analyze', { method: 'POST', body: fd }));
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'INVALID_INPUT');
  }

  // 3. Mode bi_temporal missing image_b
  {
    const fd = new FormData();
    fd.append('query', 'Test query');
    fd.append('mode', 'bi_temporal');
    fd.append('image_a', createTestFile('img.png'));
    const res = await POST(new Request('http://localhost:3000/api/analyze', { method: 'POST', body: fd }));
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.message.includes('requires image_b'));
  }
});
