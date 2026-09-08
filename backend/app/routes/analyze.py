import time
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional, List

from app.schemas.analysis import AnalysisMode
from app.schemas.result import AnalysisResultResponse, ExecutionStage
from app.services.router import TaskRouter, ResultIntegrator
from app.models.registry import registry

router = APIRouter()

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_file(file: UploadFile, field_name: str):
    if not file:
        raise HTTPException(status_code=400, detail=f"Missing required file: {field_name}")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format for {field_name}: {ext}. Only PNG, JPEG, and TIFF are supported.")
    
    if getattr(file, "size", 0) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File {field_name} exceeds the maximum allowed size of 50MB.")

@router.post("/internal/analyze", response_model=AnalysisResultResponse)
async def analyze_endpoint(
    query: str = Form(...),
    mode: str = Form(...),
    image_a: UploadFile = File(...),
    image_b: Optional[UploadFile] = File(None)
):
    stages: List[ExecutionStage] = []
    
    def log_stage(name: str):
        stages.append(ExecutionStage(stage=name, status="completed", timestamp=time.time()))

    try:
        start_time = time.time()
        log_stage("request_received")

        # 1. Validation
        if not query or not query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        try:
            analysis_mode = AnalysisMode(mode)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unsupported mode: {mode}")

        validate_file(image_a, "image_a")

        if analysis_mode in [AnalysisMode.OPTICAL_SAR, AnalysisMode.BI_TEMPORAL]:
            if not image_b:
                raise HTTPException(status_code=400, detail=f"mode {mode} requires image_b")
            validate_file(image_b, "image_b")
        
        log_stage("input_validated")

        # 2. Classify task
        task = TaskRouter.classify_task(query, analysis_mode)
        log_stage("task_selected")

        # 3. Select model
        try:
            model_id = TaskRouter.select_model(task)
            model = registry.get_model(model_id)
            log_stage("model_selected")
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))

        # 4. Execute inference
        inference_result = model.run(query=query)
        log_stage("inference_mocked")

        # 5. Integrate result
        log_stage("result_generated")
        result_data = ResultIntegrator.integrate(
            query=query,
            mode=analysis_mode,
            task=task,
            model_id=model_id,
            start_time=start_time,
            inference_result=inference_result,
            stages=stages
        )

        return AnalysisResultResponse(
            success=True,
            data=result_data
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

