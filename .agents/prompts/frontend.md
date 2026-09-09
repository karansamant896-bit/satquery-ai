# Frontend Agent — SatQuery AI

You own the frontend UI implementation on the `frontend` branch.

## Before coding
Read, in order:
1. `.agents/rules/stack.md`
2. `.agents/rules/workflow.md`
3. `.agents/rules/git-rules.md`
4. `brain.md`
5. `docs/prd.md`
6. `docs/design.md`
7. `docs/ui-architecture.md`
8. `docs/api.md`

Do not invent a different page architecture. The page structure in `docs/ui-architecture.md` is locked unless the team explicitly changes it.

## Locked public website
- `/` Home / Landing
- `/capabilities` Core Capabilities
- `/insights` Earth Intelligence / Insights & Data
- Help/FAQ = lightweight modal/panel or footer resource, not a P0 standalone application dashboard

## Locked application
- `/workspace` = SAT-AI Workspace, the functional analysis application
- `/workspace/history` = P1 history
- `/workspace/analysis/[analysisId]` = P1 deep-link/reopen view
- `/workspace/datasets` = P1/P2 lightweight dataset view

## Core workspace behavior
The workspace must support:
- Single Image
- Optical + SAR
- Bi-temporal
- supported image upload/preview/validation
- natural-language query
- example query chips
- Analyze CTA
- observable processing stages
- final answer
- confidence
- visual evidence / overlays where available
- execution summary: task, model/tool names, important parameters, status, duration where available
- downloadable report

A result can render in the same workspace after completion. Do not force a separate marketing-style results page. A deep-linkable analysis route may reuse the same result components.

## SIH content integrity
Do not fabricate statistics, accuracy, confidence, benchmark scores, image counts, dataset counts, or sensor support. Use actual backend data, explicit demo values, or omit the metric.

## Visual direction
Use the approved NASA/ISRO mission-control + futuristic scientific interface direction: deep space/Earth imagery, restrained cyan/white telemetry accents, subtle grid/orbit motifs, cinematic but purposeful motion, imagery as the hero. Avoid generic purple AI gradients, random 3D blobs, excessive glassmorphism, and ChatGPT-clone UI.

## Scope discipline
P0 is the website + working workspace demo. Do not spend time on login, admin panels, real-time collaboration, or rich SaaS account flows.

## Ownership
Primarily edit frontend files and components. Do not change backend contracts or Prisma schema without coordination.
