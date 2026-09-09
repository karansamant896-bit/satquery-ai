# SatQuery AI — Product Requirements

## 1. Problem
Remote-sensing analysis is fragmented into task-specific tools. Non-expert users should be able to ask natural-language questions over single, paired cross-modal, or bi-temporal imagery without manually choosing specialist models or GIS workflows.

## 2. Target User
Students, researchers, analysts, and judges who need to ask questions about remote-sensing imagery without manually operating multiple specialist models.

## 3. Product Surface & User Journey

### Public website
1. Open Home.
2. Learn the concept and see the primary CTA.
3. Optionally view Capabilities and Insights.
4. Click **Launch Sat-AI**.

### SAT-AI Workspace
5. Select input mode: single image, optical + SAR, or bi-temporal.
6. Upload supported image files.
7. System validates format/compatibility.
8. Enter natural-language query.
9. Agentic controller identifies the task.
10. Specialist model/tool is selected.
11. Tools execute.
12. Outputs are integrated.
13. UI displays answer, confidence, evidence, and auditable execution summary.
14. User downloads the report.

The result may remain in the workspace or be reopened through `/workspace/analysis/[analysisId]`.

## 4. Mandatory Requirements
- Single-image VQA.
- One additional single-image task: caption/scene description OR text-guided grounding.
- Bi-temporal change description or change-based VQA.
- Co-registered optical + SAR complementary analysis.
- Automatic specialist model/tool selection and execution.
- At least one visual/VLM component fine-tuned or otherwise adapted using BigEarthNet.txt or permitted open-source training data.

## 5. Representative Queries
- Describe the land-cover and major objects visible in this image.
- Highlight the water body referred to in the query.
- What changed between these two dates, and where did the change occur?
- Use the optical and SAR images together to identify built-up and water-covered regions.
- Has the built-up area increased, decreased, or remained unchanged?

## 6. Acceptance Criteria
A P0 demo is acceptable when a supported input reaches the correct workflow automatically, the selected tool executes, a useful answer is shown, visual evidence is shown where applicable, confidence and execution trace are visible, and the result can be downloaded/reproduced.

## 7. Non-goals
- login/signup as a demo blocker
- mandatory user accounts
- marketing-site analytics dashboards that are not backed by real data
- admin dashboard
- full GIS editing suite
- real-time collaboration
- large-scale training during hackathon
- autonomous satellite data acquisition
- multi-agent conversational swarm

## 8. UX Principles
The public website should explain and impress; the SAT-AI workspace should perform the actual analysis. Keep the workspace focused: clear input mode, clear upload requirements, one query box, one primary Analyze action, visible processing stages, evidence first, and an auditable model/tool trace without hidden reasoning text.

Do not invent statistics, benchmark scores, confidence values, image counts, or dataset claims.
