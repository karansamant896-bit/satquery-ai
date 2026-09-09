from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class AnalysisMode(str, Enum):
    SINGLE = "single"
    OPTICAL_SAR = "optical_sar"
    BI_TEMPORAL = "bi_temporal"

# Note: The actual file uploads will be handled via FastAPI Form/File parameters
# in the route handler, but we use these models for structured internal data.

class AnalyzeRequest(BaseModel):
    query: str
    mode: AnalysisMode

class AnalysisTask(str, Enum):
    VQA = "vqa"
    CAPTIONING = "captioning"
    GROUNDING = "grounding"
    CHANGE_ANALYSIS = "change_analysis"
    OPTICAL_SAR_ANALYSIS = "optical_sar_analysis"
