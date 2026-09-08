# SatQuery AI — Master Stack & Architecture Rules

## 0. Project Identity
- Project: SatQuery AI
- SIH Problem Statement ID: 26167
- Goal: Interactive agentic vision-language assistant for remote-sensing image analysis.
- Inputs: single optical/multispectral or SAR image; co-registered optical + SAR pair; bi-temporal pair.
- Supported upload formats: GeoTIFF/TIFF. PNG/JPEG only for approved benchmark inputs.

## 1. Approved Stack
### Web Application
- Next.js App Router
- TypeScript strict mode
- React Server Components by default
- Tailwind CSS
- shadcn/ui
- Lucide React

### Web Backend / Orchestration
- Next.js server-side code for application orchestration
- Server Actions for normal mutations and database operations
- One thin Next.js Route Handler may be used for large multipart analysis uploads/streaming to the ML service.
- Do NOT create a general REST backend inside Next.js.

### ML / Remote-Sensing Service
- Python
- FastAPI
- PyTorch
- Hugging Face Transformers where appropriate
- Rasterio/GDAL for GeoTIFF and geospatial raster handling
- Pillow/OpenCV only where needed
- Pretrained or pre-adapted remote-sensing model/checkpoints
- Model registry + task adapters

### Database
- PostgreSQL hosted by Supabase
- Prisma ORM from the Next.js application
- One canonical database schema
- Never hardcode stale dependency versions; verify current supported versions during bootstrap.

### Auth
- Supabase Auth only if authentication is actually needed.
- Authentication is NOT a mandatory MVP feature.

### Storage
- Supabase Storage for persistent uploaded images/reports when cloud storage is needed.
- Local temporary storage is acceptable in local/demo development.

## 2. Mandatory Functional Capabilities
1. Single-image VQA.
2. One additional single-image task: caption/scene description OR text-guided region grounding.
3. Bi-temporal change analysis/change-VQA.
4. Co-registered optical + SAR analysis.
5. Automatic query/input-driven specialist model/tool selection.
6. Evidence-grounded output with visual evidence where the selected task supports it.
7. Confidence information.
8. Observable execution trace: detected task, selected models/tools, key permitted parameters, outputs/status.
9. Downloadable result/report.

## 3. Remote-Sensing Adaptation Rule
- A generic LLM/VLM alone is NOT sufficient.
- At least one visual/VLM component must be fine-tuned or otherwise adapted using BigEarthNet.txt or permitted open-source training data, as required by the problem statement.
- Prepare and test the adapted checkpoint before the 24-hour build whenever possible.
- Do NOT attempt full-scale dataset training during the 24-hour hackathon.

## 4. Architecture Rules
### Keep the application simple
Prefer only:
- Next.js web app
- Python ML service
- Supabase PostgreSQL/storage/auth as needed

Do not introduce microservices, Kafka, Redis, Kubernetes, or a task queue unless the MVP demonstrably requires them.

### Thin boundary between web and ML
Next.js owns UI, input/form handling, analysis request creation, persistence, history/report retrieval.
FastAPI owns image validation, GeoTIFF decoding/preprocessing, task routing, specialist inference, evidence, confidence, execution trace.

### Contract first
1. Update docs/api.md.
2. Update docs/database.md if data shape changes.
3. Implement against the documented contract.
4. Test the contract.

### Model registry
Every specialist model/tool is registered with:
- id
- task
- accepted input mode
- required modality
- output type
- execution function
- confidence strategy
- availability/status

### Observable orchestration
validate -> classify -> select tools -> execute -> integrate -> score confidence -> return evidence + trace.
Never expose hidden chain-of-thought; expose only the auditable execution summary.

### Demo-first
Do not add admin portals, elaborate profiles, complex RBAC, notifications, unnecessary analytics, or generic chat before the mandatory demo is stable.

## 5. Dependency Rules
- Verify current supported release from official documentation/package registry.
- Check relevant security advisories.
- Prefer existing dependencies.
- Never copy stale versions from reference documents.
- Commit lockfiles.
- Never commit secrets.

## 6. Secrets and Files
Never commit .env, API keys, service-role keys, private certificates, uploaded images, private reports, node_modules, Python virtual environments, model weights, or build outputs.
Commit .env.example, source, lockfiles, docs, model registry metadata/config, and setup instructions.

## 7. Code Style
- TypeScript strict.
- Python type hints for non-trivial functions.
- Small readable modules.
- Avoid unnecessary abstraction.
- Reuse helpers.
- Do not duplicate business logic.
- Never swallow inference/database errors silently.
- Do not log secrets.

## 8. Scope Rule
Before changing code ask:
1. Is it required for the core SIH demo?
2. Is there a simpler existing solution?
3. Does it cross another agent's ownership boundary?
4. Can it be tested in the remaining time?

If not necessary for the core demo, defer it.
