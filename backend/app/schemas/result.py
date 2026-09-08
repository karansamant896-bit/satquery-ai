from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

class EvidenceItem(BaseModel):
    type: str = Field(description="bbox, mask, change_map, image, text")
    label: str
    url: str
    score: float

class ToolStatus(BaseModel):
    id: str
    status: str

class ExecutionStage(BaseModel):
    stage: str
    status: str
    timestamp: float

class ExecutionTrace(BaseModel):
    inputMode: str
    selectedTools: List[ToolStatus]
    stages: List[ExecutionStage]
    durationMs: Optional[int] = None
    parameters: Optional[Dict[str, Any]] = None
    selectedTask: Optional[str] = None

class AnalysisResultData(BaseModel):
    analysisId: str
    status: str
    task: str
    answer: str
    confidence: float
    evidence: List[EvidenceItem]
    executionTrace: ExecutionTrace
    reportUrl: Optional[str] = None

class AnalysisResultResponse(BaseModel):
    success: bool
    data: Optional[AnalysisResultData] = None
    error: Optional[Dict[str, str]] = None
