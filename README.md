# SatQuery AI

SIH Problem Statement 26167

## Purpose
Interactive agentic vision-language assistant for remote-sensing image analysis through natural-language queries.

## Core MVP
- single-image VQA
- captioning OR grounding
- bi-temporal change analysis
- optical + SAR analysis
- automatic tool/model selection
- evidence + confidence + execution trace
- downloadable report

## Services
- Next.js web app
- Python FastAPI ML service
- Supabase PostgreSQL + Storage
- Prisma ORM

## Start Here
Read:
- .agents/rules/stack.md
- .agents/rules/workflow.md
- .agents/rules/git-rules.md
- brain.md
- docs/*.md

Do not add features before the mandatory end-to-end demo is stable.


## UI Structure (Locked)
Public website: Home, Capabilities, Insights, lightweight Help/FAQ. The **Launch Sat-AI** CTA opens the functional `/workspace`. See `docs/ui-architecture.md` for the locked page and routing contract.
