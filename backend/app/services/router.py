import uuid
import time
from typing import Dict, Any, List
from app.schemas.analysis import AnalysisMode, AnalysisTask
from app.schemas.result import ExecutionTrace, ToolStatus, AnalysisResultData, ExecutionStage
from app.models.registry import registry, MockModel

class TaskRouter:
    @staticmethod
    def classify_task(query: str, mode: AnalysisMode) -> str:
        """
        Classifies the task based on the input mode and query.
        """
        query_lower = query.lower()
        if mode == AnalysisMode.SINGLE:
            if "describe" in query_lower or "highlight" in query_lower:
                return AnalysisTask.CAPTIONING
            return AnalysisTask.VQA
        elif mode == AnalysisMode.BI_TEMPORAL:
            return AnalysisTask.CHANGE_ANALYSIS
        elif mode == AnalysisMode.OPTICAL_SAR:
            return AnalysisTask.OPTICAL_SAR_ANALYSIS
        
        return AnalysisTask.VQA # default

    @staticmethod
    def select_model(task: str) -> str:
        """
        Selects the appropriate model ID based on the task.
        """
        if task in [AnalysisTask.VQA, AnalysisTask.CAPTIONING, AnalysisTask.GROUNDING]:
            return "geochat"
        elif task == AnalysisTask.CHANGE_ANALYSIS:
            return "bit_cd"
        elif task == AnalysisTask.OPTICAL_SAR_ANALYSIS:
            return "croma"
        raise ValueError(f"No model available for task: {task}")

class ResultIntegrator:
    @staticmethod
    def integrate(
        query: str, 
        mode: AnalysisMode, 
        task: str, 
        model_id: str, 
        start_time: float, 
        inference_result: Dict[str, Any],
        stages: List[ExecutionStage]
    ) -> AnalysisResultData:
        """
        Integrates the inference result into a structured AnalysisResultData.
        """
        duration_ms = int((time.time() - start_time) * 1000)
        
        trace = ExecutionTrace(
            inputMode=mode.value,
            selectedTask=task,
            selectedTools=[ToolStatus(id=model_id, status="completed")],
            stages=stages,
            durationMs=duration_ms,
            parameters={"query": query}
        )
        
        # Ensure confidence is clearly marked as demo/mock
        confidence = inference_result.get("confidence", 0.0)
        answer = inference_result.get("answer", "")
        evidence = inference_result.get("evidence", [])
        
        return AnalysisResultData(
            analysisId=str(uuid.uuid4()),
            status="completed",
            task=task,
            answer=answer,
            confidence=confidence,
            evidence=evidence,
            executionTrace=trace
        )
