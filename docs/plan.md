# SatQuery AI — 24-Hour Implementation Plan

## Phase 0 — Before Hackathon
- freeze architecture
- prepare GeoTIFF/TIFF samples
- prepare optical+SAR pair
- prepare bi-temporal samples
- prepare at least one adapted checkpoint
- pre-download model weights
- verify model loading on intended machine
- test GeoTIFF parsing
- test every specialist tool individually
- prepare demo prompts
- prepare fallback path
- verify compute/deployment path
- build repository control files

## Phase 1 — Bootstrap
- Next.js app boots
- FastAPI service boots
- DB connection works
- storage configured if used
- contracts reviewed

## Phase 2 — Frontend
- landing
- analysis workspace
- input selector
- upload
- query
- processing states
- result skeleton

## Phase 3 — Database
- Analysis
- InputImage
- ExecutionStep
- Evidence
- migration

## Phase 4 — ML
- input validation
- GeoTIFF decoding
- model registry
- query classifier/planner
- VQA
- captioning OR grounding
- change tool
- optical-SAR tool
- result integration
- confidence/evidence
- execution trace

## Phase 5 — Integration
- Next.js -> FastAPI
- FastAPI -> result
- DB persistence
- evidence display
- report generation
- failure state

## Phase 6 — Mandatory Demo Verification
### A
Single image: "Describe the land-cover and major objects visible in this image."
### B
Single image: "Highlight the water body referred to in the query." or equivalent captioning task.
### C
Bi-temporal: "What changed between these two dates, and where did the change occur?"
### D
Optical + SAR: "Use the optical and SAR images together to identify built-up and water-covered regions."
### E
Confirm automatic task/tool selection and visible execution trace.

## Final 3 Hours
- fix P0 bugs
- polish UI
- improve loading states
- make evidence readable
- make report/download reliable
- freeze features
- rehearse demo
- prepare local fallback if deployment fails

## Stop Rule
Do not begin optional features while a mandatory journey is broken. Do not introduce new infrastructure during final 6 hours unless necessary to recover a P0 path.
