# SatQuery AI — UI/UX Design

## 1. Core Design Decision

SatQuery AI has **two separate surfaces**:

- **Public website:** Home, Capabilities, Insights, plus lightweight Help/FAQ.
- **SAT-AI Workspace:** the actual functional application launched from the public website.

The application is not a login-first SaaS dashboard. Authentication is optional and must not block the SIH demo.

## 2. Public Website

### Home — `/`
- Cinematic hero.
- SatQuery AI identity and Earth-observation positioning.
- Primary CTA: Launch Sat-AI.
- ASK → ANALYZE → VISUALIZE → UNDERSTAND pipeline.
- Short explanation of the problem and solution.
- Supported modes preview.
- Example queries grounded in the SIH PS.
- Footer navigation + Help/FAQ.

### Capabilities — `/capabilities`
Use large visual storytelling blocks:
1. Natural-language VQA.
2. Optical + SAR analysis.
3. Bi-temporal change analysis.
4. Scene understanding / grounding.
5. Evidence + confidence.
6. Visualization + reports.

The visuals must be demonstrative, not fabricated. Any metrics shown must be sourced from actual demo output or explicitly labeled sample/demo data.

### Insights — `/insights`
- Dataset/imagery information actually used.
- Real or clearly labeled demo statistics only.
- Earth map/region visualization when feasible.
- Technical pipeline for judges.
- Explanation of remote-sensing adaptation and specialist model routing.

### Help / FAQ
Lightweight modal or small support page; not a major P0 route.

## 3. SAT-AI Workspace

### Workspace — `/workspace`

Header:
- SatQuery AI
- Workspace status
- optional settings/profile affordance

Left rail:
- Workspace
- History
- Analysis
- Datasets

Main panel:
- Satellite viewer
- input mode
- upload/preview
- query composer
- result/evidence area

### Input modes

**Single Image**
- one optical/multispectral or SAR image
- VQA
- caption/scene description or grounding

**Optical + SAR**
- co-registered optical/multispectral image
- SAR image
- complementary analysis

**Bi-temporal**
- image A/date A
- image B/date B
- change description/change-VQA

### Upload UX
- drag/drop + file picker
- format and size guidance
- client-side validation
- image preview
- replace/remove
- metadata summary when available
- clear message when the selected mode requires a second compatible image

The PS supports GeoTIFF/TIFF for geospatial imagery; PNG/JPEG may be accepted only for prescribed benchmark datasets.

### Query UX
- one primary natural-language query box
- representative query chips
- no complex parameter form unless the selected specialist workflow genuinely needs it
- one primary Ask/Analyze CTA

### Processing UI
Show only observable execution stages:
1. Input validation
2. Query/task classification
3. Model/tool selection
4. Specialist inference
5. Evidence integration
6. Final response

Do not expose hidden chain-of-thought. The PS evaluates an auditable trace containing task/model/tool/parameters/outputs, not internal reasoning text.

### Result UI
- final answer
- confidence
- selected task
- source image(s)
- visual evidence overlay/mask/bounding boxes/change map when supported
- legend / evidence explanation
- execution summary
- downloadable report

### Result routing
The result may appear in the same workspace after analysis. A deep-linkable `/workspace/analysis/[analysisId]` route may be used for reopening a stored analysis.

## 4. Workspace Secondary Views

### History — `/workspace/history`
P1. Previous analyses, timestamps, query, task, status, confidence, and open/review action.

### Analysis Detail — `/workspace/analysis/[analysisId]`
P1. Reuse the result UI.

### Datasets — `/workspace/datasets`
P1/P2. Keep lightweight; only show demo datasets/samples actually available.

## 5. States
Every async operation should have:
- idle
- validating
- processing
- success
- partial success
- error

## 6. Accessibility & Responsiveness
- visible keyboard focus
- readable contrast
- do not encode meaning by color only
- meaningful buttons/labels
- desktop-first for the judge demo, but core controls should remain usable on smaller screens

## 7. Visual Identity
Target: NASA/ISRO mission-control + futuristic scientific interface.
- deep space / Earth imagery
- restrained cyan/white accents
- glass/metal panels used sparingly
- grid/orbit/satellite motifs
- smooth cinematic transitions
- satellite imagery remains the visual hero

Avoid generic purple AI gradients, random floating 3D blobs, excessive glass effects, and ChatGPT-clone styling.
