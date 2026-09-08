# SatQuery AI — Project Brain

> Single source of current project state. Keep concise and factual.

## Project
- SIH ID: 26167
- Name: SatQuery AI
- Goal: Agentic vision-language assistant for remote-sensing image analysis through natural-language queries.

## Mandatory Demo Capabilities
- [ ] Single-image VQA
- [ ] Single-image captioning OR text-guided grounding
- [ ] Bi-temporal change analysis/change-VQA
- [ ] Optical + SAR paired analysis
- [ ] Automatic specialist model/tool selection
- [ ] Evidence-grounded response
- [ ] Confidence information
- [ ] Observable execution trace
- [ ] Downloadable report

## Adaptation Requirement
- [ ] At least one visual/VLM component adapted using BigEarthNet.txt or permitted open-source training data
- [ ] Adapted checkpoint prepared before hackathon
- [ ] Adapted checkpoint tested on representative inputs

## UI / Page Architecture — LOCKED

Public website:
- `/` Home / Landing
- `/capabilities` Core Capabilities
- `/insights` Earth Intelligence / Insights & Data
- Help / FAQ as lightweight modal/panel, not a P0 major page

Application:
- `/workspace` SAT-AI Workspace (P0)
- `/workspace/history` History (P1)
- `/workspace/analysis/[analysisId]` Analysis detail deep-link (P1)
- `/workspace/datasets` Datasets (P1/P2)

Launch flow: Home → Capabilities/Insights (optional) → Launch Sat-AI → Workspace → Analyze → Evidence/Confidence/Trace/Report.

No login/signup requirement for the demo.

## Architecture
Web: Next.js + TypeScript + Tailwind + shadcn/ui
ML: Python + FastAPI + PyTorch/Transformers + Rasterio/GDAL
Data: PostgreSQL/Supabase + Prisma
Storage: Supabase Storage or local temporary storage for demo

## Current Status
### P0
- [x] Project scaffold
- [x] Shared contracts complete
- [ ] Sample image inputs ready
- [x] Model registry ready
- [x] Query router ready
- [x] Single-image VQA working
- [ ] Second single-image task working
- [x] Bi-temporal workflow working
- [x] Optical-SAR workflow working
- [ ] End-to-end UI integration working
- [ ] Report generation working

### P1
- [ ] History
- [ ] Better confidence presentation
- [ ] Improved overlays
- [x] Error/fallback handling

### P2
- [ ] Optional authentication
- [ ] Optional richer analytics

## Active Task
M6 Database Persistence verified (Prisma contract + Supabase Storage + /api/analyze orchestration).

## Current Integration Contract
See docs/api.md, docs/database.md, docs/tech.md.

## Current Known Issues
None recorded.

## Model/Tool Registry Status
- [x] VQA (GeoChat)
- [ ] Captioning
- [ ] Grounding
- [x] Change analysis (BIT-CD)
- [x] Optical-SAR analysis (CROMA)
- [ ] Report generation

## Last Integration
Date: 2026-09-09
Milestone: M6 — Database Persistence
Summary: Merged database branch with Prisma Postgres contract & Supabase storage; implemented /api/analyze persistence orchestration with full test suite.

## Next Milestone
M7: End-to-end UI integration / Frontend workspace.
