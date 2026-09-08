from typing import Dict, Any, List
import time
from app.schemas.result import EvidenceItem
from app.models.adapters.geochat_adapter import GeoChatAdapter
from app.models.adapters.bit_cd_adapter import BITCDAdapter
from app.models.adapters.croma_adapter import CROMAAdapter

class MockModel:
    def __init__(self, model_id: str, task: str, modality: str, status: str):
        self.id = model_id
        self.task = task
        self.modality = modality
        self.status = status

    def run(self, query: str, config: Dict[str, Any] = None, **kwargs) -> Dict[str, Any]:
        # Simulate some processing time
        time.sleep(0.5)
        
        if "log_cb" in kwargs and kwargs["log_cb"]:
            kwargs["log_cb"]("inference_completed")
        
        # This is a mock response generator.
        # In the future, this will call the actual ML model inference methods.
        answer = f"[Mock {self.id}] Analyzed query: '{query}'"
        
        # Return mock structured output
        return {
            "answer": answer,
            "confidence": 0.85, # Demo confidence
            "evidence": [
                EvidenceItem(
                    type="text",
                    label=f"Mock evidence from {self.id}",
                    url="N/A",
                    score=0.9
                )
            ]
        }

class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._register_mocks()

    def _register_mocks(self):
        # Register the GeoChat adapter which handles real/mock logic dynamically
        self.register("geochat", GeoChatAdapter())
        
        # Register the BIT-CD adapter
        self.register("bit_cd", BITCDAdapter())

        # Register the CROMA adapter
        self.register("croma", CROMAAdapter())

    def register(self, model_id: str, model_instance: Any):
        self._models[model_id] = model_instance

    def get_model(self, model_id: str) -> Any:
        if model_id not in self._models:
            raise ValueError(f"Model {model_id} not found in registry")
        return self._models[model_id]

# Singleton registry instance
registry = ModelRegistry()
