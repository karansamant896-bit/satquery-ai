# SatQuery AI — API / Service Contract

> This is the shared contract. Frontend and backend agents implement against it.

## 1. Analyze Request
### POST /api/analyze
Purpose: accept one/two supported images + query, validate, call ML service, return analysis id/result.

### Multipart fields
- query: string
- mode: single | optical_sar | bi_temporal
- image_a: file
- image_b: optional file

### Input rules
Single: exactly 1 image.
Optical-SAR: exactly 2 images; identify optical/SAR when metadata cannot.
Bi-temporal: exactly 2 spatially corresponding images; acquisition dates when available.
Accepted: GeoTIFF/TIFF generally; PNG/JPEG only for approved benchmark inputs.

### Success response
```json
{
  "success": true,
  "data": {
    "analysisId": "string",
    "status": "completed",
    "task": "vqa",
    "answer": "string",
    "confidence": 0.0,
    "evidence": [],
    "executionTrace": {
      "inputMode": "single",
      "selectedTools": [],
      "stages": []
    },
    "reportUrl": "string"
  }
}
```

## 2. Long-Running Analysis
If inference is too slow, POST returns analysisId + status=processing.
Then GET /api/analyze/{analysisId} returns processing/completed/failed.

## 3. Evidence Item
```json
{
  "type": "bbox|mask|change_map|image|text",
  "label": "string",
  "url": "string",
  "score": 0.0
}
```

## 4. Execution Trace
```json
{
  "selectedTask": "change_analysis",
  "selectedTools": [{"id":"rs_change","status":"completed"}],
  "parameters": {},
  "durationMs": 0
}
```
Only observable/auditable metadata. Never return hidden chain-of-thought.

## 5. Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT|UNSUPPORTED_FORMAT|INFERENCE_FAILED|INTERNAL_ERROR",
    "message": "Human-readable message"
  }
}
```

## 6. Health
GET /health

## 7. Internal ML contract
POST /internal/analyze with query, normalized metadata, image locations, and mode. Returns task, tool results, evidence, confidence, execution trace. Browser never talks directly to private ML endpoints.
