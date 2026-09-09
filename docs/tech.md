# SatQuery AI — Technical Architecture

## 1. High-Level Architecture

```text
Browser
  |
  v
Next.js Web App
  |
  +--> Supabase/PostgreSQL via Prisma
  |
  +--> Supabase Storage
  |
  +--> FastAPI ML Service
          |
          +--> Input Validator / GeoTIFF Reader
          +--> Query Classifier / Planner
          +--> Model & Tool Registry
          |       +--> VQA
          |       +--> Captioning / Grounding
          |       +--> Change Analysis
          |       +--> Optical-SAR Analysis
          +--> Evidence Generator
          +--> Result Integrator
```

## 2. Service Responsibilities
### Next.js
UI, form handling, analysis request creation, persistence, history/report retrieval.

### FastAPI ML Service
Image parsing, GeoTIFF/TIFF validation, preprocessing, task routing, specialist inference, evidence, confidence, execution trace.

### Database
Analysis records, input metadata, execution traces, evidence metadata, optional user identity.

## 3. Input Modes
- single: one image + query
- optical_sar: optical + co-registered SAR + query
- bi_temporal: image A + image B + query

## 4. Model Registry
Each tool exposes:
- id
- task
- input_mode
- required_modalities
- run(input, query, config)
- returns answer/evidence/confidence/metadata

Examples: rs_vqa, rs_caption, rs_grounding, rs_change, rs_optical_sar.

## 5. Orchestrator
validate -> classify -> select tools -> execute -> integrate -> score confidence -> return evidence + trace.

## 6. Large-Image Handling
Inspect dimensions first; downsample/tile where needed; preserve original reference; enforce demo-safe limits; avoid unnecessary full-resolution transfers.

## 7. Async Strategy
Start synchronous if inference is short enough. Introduce a lightweight job/polling mechanism only if model latency requires it. Do not add Celery/Redis automatically.

## 8. Error Boundary
Every failure identifies stage, tool/model, safe message, and retryability. Never fabricate results.

## 9. Deployment
Preferred hackathon topology:
- Next.js web app
- Python FastAPI ML service on machine with required compute
- Supabase PostgreSQL
- Supabase Storage if persistence is needed

Docker only if it simplifies repeatable deployment.
