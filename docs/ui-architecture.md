# SatQuery AI — Website & Application UI Architecture

## 1. Product Surface Model

SatQuery AI is intentionally split into two surfaces:

1. **Public website** — explains, visualizes, and demonstrates the platform concept.
2. **SAT-AI Workspace** — the functional application where judges upload imagery, ask questions, run analysis, inspect evidence, and download reports.

This separation is part of the MVP. Do not merge the marketing website and the analysis workspace into one giant page.

## 2. Public Website Pages

### `/` — Home / Landing
Purpose: create a strong first impression, explain the problem/solution, and launch the application.

Required sections:
- Cinematic hero with SatQuery AI identity.
- Short statement: AI-powered Earth observation / natural-language satellite analysis.
- Primary CTA: **Launch Sat-AI**.
- Short explanation of what SatQuery AI does.
- Visual pipeline: Ask → Analyze → Visualize → Understand.
- Brief preview of supported analysis modes.
- Example queries from the SIH problem statement.
- Footer with navigation and Help/FAQ access.

### `/capabilities` — Core Capabilities
Purpose: answer “What can SatQuery actually do?”

Use large interactive visual blocks, not a generic feature-card grid. Required blocks:
1. Natural-language queries / single-image VQA.
2. Optical + SAR complementary analysis.
3. Bi-temporal change analysis.
4. Image understanding / scene description or grounding.
5. Evidence-grounded answers with confidence.
6. Visualization, maps, comparisons, and reports.

Every visual example must reflect a capability the backend actually supports. Do not invent results or percentages.

### `/insights` — Earth Intelligence / Insights & Data
Purpose: make the project feel research-oriented and technically credible for judges.

Required sections:
- Dataset / imagery information, listing only sources actually used.
- Analysis statistics only when backed by real data or clearly marked as demo values.
- Interactive Earth/map section where feasible.
- Technical “How it works” pipeline showing query understanding, image validation, specialist model/tool routing, multimodal reasoning, evidence, and final response.
- Short explanation of the remote-sensing adaptation requirement.

### Help / FAQ
Help is lightweight, not a full primary navigation page for the MVP.

Access from footer or a small modal/panel. Cover:
- Getting started
- Uploading imagery
- Writing queries
- Understanding results
- Multimodal analysis
- Troubleshooting

## 3. SAT-AI Application

### `/workspace` — SAT-AI Workspace

The **Launch Sat-AI** CTA opens the application. The workspace is a separate application shell, visually consistent with the public site but more functional and data-dense.

Suggested shell:
- Header: SatQuery AI + workspace status + optional settings/profile affordance.
- Left navigation / workspace rail:
  - Workspace
  - History
  - Analysis
  - Datasets
- Main satellite viewer / analysis area.
- Query composer at the bottom or side of the viewer.

### Workspace default view
Must support:
- Input mode selector: Single Image / Optical + SAR / Bi-temporal.
- One-image or two-image upload depending on mode.
- Supported format guidance (GeoTIFF/TIFF; approved benchmark PNG/JPEG only where applicable).
- Client-side validation and preview.
- Query text area.
- Representative-query chips.
- Primary **Ask / Analyze** CTA.
- Processing stages.
- Result area in the same workspace after completion.

### Result state
Results can render as a workspace state rather than forcing a separate top-level page. A deep-linkable route such as `/workspace/analysis/[analysisId]` may be used when helpful.

Result must show:
- Final answer.
- Confidence.
- Task selected by the orchestrator.
- Visual evidence: overlay, mask, bounding box, change map, or relevant image evidence when supported.
- Execution summary with selected model/tool names, important parameters, status, and duration when available.
- Downloadable report.
- Clear error / partial-success state when applicable.

### `/workspace/history` — History
P1, not required before the core end-to-end demo works.

Show previous analyses with:
- timestamp
- query
- task type
- status
- confidence if available
- open/review action

Do not require authentication for the hackathon unless the team explicitly adds it later.

### `/workspace/analysis/[analysisId]` — Analysis Detail
Optional route for reopening a saved analysis. It reuses the same result components as the workspace result state.

### `/workspace/datasets` — Datasets
P1/P2. This should be a lightweight information/selection surface, not a full data-management platform. If implementation time is tight, show only the demo datasets/samples actually available.

## 4. Navigation Flow

```text
PUBLIC WEBSITE
Home ────────┐
             ├── Capabilities
             ├── Insights
             └── Help / FAQ
             │
             └── [Launch Sat-AI]
                     ↓
SAT-AI APPLICATION
/workspace
   ├── Workspace (P0)
   ├── History (P1)
   ├── Analysis (P1 / deep-link detail)
   └── Datasets (P1/P2)
```

## 5. Judge Demo Flow

Preferred 60–120 second path:
1. Open Home.
2. Show the concept and supported modes.
3. Open Capabilities or briefly scroll to one relevant capability.
4. Click Launch Sat-AI.
5. Select a prepared demo input.
6. Ask a representative SIH query.
7. Show processing stages / specialist routing.
8. Show answer + confidence + visual evidence + execution trace.
9. Open/download report.

The first three public pages explain the technology; the workspace demonstrates the technology.

## 6. Scope Rules

P0:
- Home
- Capabilities
- Insights
- Workspace
- Real end-to-end query flow
- Evidence/confidence/trace/report

P1:
- History
- Analysis detail deep-link
- Better map interactions

P2:
- Rich dataset management
- Authentication
- Admin dashboard
- Real-time collaboration

Do not add login/signup, admin, complex dashboards, or generic SaaS account flows unless the team explicitly changes scope.

## 7. Visual Direction

Use a **NASA/ISRO mission-control + futuristic scientific interface** rather than generic “AI startup” styling:
- deep space / Earth imagery
- restrained cyan/white telemetry accents
- glass/metal panels used sparingly
- grid/orbit/satellite motifs
- cinematic but purposeful transitions
- imagery is the visual hero

Avoid:
- generic purple AI gradients
- random floating blobs
- excessive glassmorphism
- ChatGPT-clone UI
- decorative 3D backgrounds that reduce readability or obscure the satellite imagery

## 8. Content Integrity

Never present fabricated benchmark scores, dataset counts, accuracy values, confidence values, image counts, or “analysis statistics.” Use real values, explicitly labeled demo values, or omit the statistic.
