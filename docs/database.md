# SatQuery AI — Database Contract

## Principles
- keep schema minimal
- never store large binary images in PostgreSQL
- store storage paths/URLs + metadata
- authentication tables only if auth is enabled
- one canonical Prisma schema

## Core Entities
### Analysis
id, status, inputMode, queryText, detectedTask, answerText, confidence, reportUrl, createdAt, completedAt, errorCode, errorMessage

### InputImage
id, analysisId, role, storagePath, originalFileName, mimeType, width, height, bands, acquisitionDate, crs, metadataJson

### ExecutionStep
id, analysisId, toolId, stage, status, parametersJson, outputSummaryJson, confidence, startedAt, completedAt, errorMessage

### Evidence
id, analysisId, type, label, storagePath, score, geometryJson, metadataJson

## Optional User
id, email, createdAt — only if auth is enabled.

## Relationships
```text
Analysis 1 ---- N InputImage
Analysis 1 ---- N ExecutionStep
Analysis 1 ---- N Evidence
User(optional) 1 ---- N Analysis
```

## Storage
Large files -> Supabase Storage/object storage. PostgreSQL -> metadata, references, structured results.

## Indexes
At minimum: Analysis.createdAt, Analysis.status, ExecutionStep.analysisId, Evidence.analysisId, InputImage.analysisId.

## Schema Change Protocol
1. Update this document.
2. Update canonical Prisma schema.
3. Apply supported migration/generation workflow.
4. Verify backend queries.
5. Update API contract if response shape changes.
