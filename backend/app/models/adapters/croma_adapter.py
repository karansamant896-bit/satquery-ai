import os
import sys
import time
import threading
import importlib.util
from typing import Dict, Any

class CROMAAdapter:
    """
    Adapter for the CROMA (Contrastive Radar-Optical Masked Autoencoders) model.

    CROMA is a foundation model that produces multimodal embeddings from
    co-registered optical (Sentinel-2, 12-channel) and SAR (Sentinel-1, 2-channel) imagery.

    Its output is NOT textual. It returns:
      - SAR_encodings, SAR_GAP
      - optical_encodings, optical_GAP
      - joint_encodings, joint_GAP

    The downstream analysis layer in this adapter computes deterministic,
    defensible statistics from these embeddings:
      1. Cosine similarity between SAR_GAP and optical_GAP (cross-modal agreement)
      2. Per-patch activation magnitudes from joint_encodings (spatial activity map)
      3. A structured textual summary derived purely from these numeric measures

    No textual answer is fabricated. Every claim traces back to a specific tensor operation.
    """

    _lock = threading.Lock()
    _shared_model = None

    def __init__(self):
        self.model_id = "croma"
        self.checkpoint_path = os.getenv("CROMA_CHECKPOINT_PATH", "")
        self.repo_path = os.getenv("CROMA_REPO_PATH", "")
        self.mode = os.getenv("ML_INFERENCE_MODE", "mock").lower()
        self.is_loaded = False

    def _ensure_loaded(self, log_cb=None):
        if self.mode == "mock":
            return

        with self._lock:
            if CROMAAdapter._shared_model is not None:
                self.is_loaded = True
                return

            if log_cb:
                log_cb("model_loading_started")

            try:
                import torch
                if not torch.cuda.is_available():
                    raise RuntimeError("CUDA is not available. Cannot initialize CROMA in local_gpu mode.")
            except ImportError:
                raise RuntimeError("CUDA is not available (PyTorch not installed). Cannot initialize CROMA in local_gpu mode.")

            # Load PretrainedCROMA from official use_croma.py via importlib
            if not self.repo_path:
                raise RuntimeError("CROMA_REPO_PATH environment variable is not set.")

            use_croma_path = os.path.join(self.repo_path, "use_croma.py")
            if not os.path.exists(use_croma_path):
                raise RuntimeError(f"Cannot find use_croma.py at {use_croma_path}")

            try:
                spec = importlib.util.spec_from_file_location("use_croma", use_croma_path)
                use_croma_mod = importlib.util.module_from_spec(spec)
                if self.repo_path not in sys.path:
                    sys.path.insert(0, self.repo_path)
                spec.loader.exec_module(use_croma_mod)
                PretrainedCROMA = use_croma_mod.PretrainedCROMA
            except Exception as e:
                raise RuntimeError(f"Failed to import PretrainedCROMA from {use_croma_path}: {e}")

            checkpoint = self.checkpoint_path if self.checkpoint_path and os.path.exists(self.checkpoint_path) else None
            if not checkpoint:
                print(f"Warning: CROMA checkpoint not found at {self.checkpoint_path}. Using uninitialized weights.")

            model = PretrainedCROMA(
                pretrained_path=checkpoint,
                size='base',
                modality='both',
                image_resolution=120
            )
            model = model.cuda()
            model.eval()

            CROMAAdapter._shared_model = model
            self.is_loaded = True

            if log_cb:
                log_cb("model_loaded")

    def _analyze_embeddings(self, outputs: dict) -> Dict[str, Any]:
        """
        Deterministic downstream analysis over raw CROMA embeddings.

        Computes:
          - cross_modal_similarity: cosine similarity between SAR_GAP and optical_GAP
          - mean_joint_activation: average L2 norm across joint_encoding patches
          - max_joint_activation: peak L2 norm across joint_encoding patches
          - spatial_activity_std: standard deviation of per-patch norms (uniformity measure)

        Returns a structured dict with a defensible textual summary and numeric evidence.
        """
        import torch
        import torch.nn.functional as F

        sar_gap = outputs["SAR_GAP"]           # (1, 768)
        optical_gap = outputs["optical_GAP"]   # (1, 768)
        joint_enc = outputs["joint_encodings"] # (1, 225, 768)

        # 1. Cross-modal cosine similarity
        cos_sim = F.cosine_similarity(sar_gap, optical_gap, dim=1).item()

        # 2. Per-patch activation norms from joint encodings
        patch_norms = torch.norm(joint_enc.squeeze(0), dim=1)  # (225,)
        mean_activation = patch_norms.mean().item()
        max_activation = patch_norms.max().item()
        std_activation = patch_norms.std().item()

        # 3. Build defensible summary from numeric evidence
        if cos_sim > 0.8:
            agreement_desc = "strong agreement"
        elif cos_sim > 0.5:
            agreement_desc = "moderate agreement"
        elif cos_sim > 0.2:
            agreement_desc = "weak agreement"
        else:
            agreement_desc = "low correlation"

        # Spatial uniformity: high std means spatially heterogeneous features
        if std_activation / (mean_activation + 1e-8) > 0.3:
            spatial_desc = "spatially heterogeneous features detected, indicating varied land-cover or structural elements"
        else:
            spatial_desc = "spatially uniform features detected, indicating homogeneous land-cover"

        answer = (
            f"Cross-modal analysis complete. "
            f"Optical-SAR embedding similarity: {cos_sim:.4f} ({agreement_desc}). "
            f"{spatial_desc.capitalize()}. "
            f"Mean joint activation: {mean_activation:.4f}, peak: {max_activation:.4f}."
        )

        metadata = {
            "cross_modal_similarity": round(cos_sim, 4),
            "mean_joint_activation": round(mean_activation, 4),
            "max_joint_activation": round(max_activation, 4),
            "spatial_activity_std": round(std_activation, 4),
            "embedding_dim": 768,
            "num_patches": 225,
            "model": "CROMA_base",
            "checkpoint": "CROMA_base.pt",
            "modality": "both",
            "image_resolution": 120,
        }

        return {
            "answer": answer,
            "confidence": None,  # CROMA does not produce calibrated confidence
            "evidence": [
                {
                    "type": "text",
                    "label": "Cross-modal cosine similarity (SAR ↔ Optical)",
                    "url": "N/A",
                    "score": round(cos_sim, 4)
                },
                {
                    "type": "text",
                    "label": "Mean joint-encoder patch activation (L2 norm)",
                    "url": "N/A",
                    "score": round(mean_activation, 4)
                },
                {
                    "type": "text",
                    "label": "Spatial activity std (heterogeneity measure)",
                    "url": "N/A",
                    "score": round(std_activation, 4)
                }
            ],
            "metadata": metadata
        }

    def run(self, query: str, image_path: str = None, image_b_path: str = None, log_cb=None, **kwargs) -> Dict[str, Any]:
        if not image_b_path:
            raise ValueError("CROMA requires two images: optical (image_a) and SAR (image_b).")

        if log_cb:
            log_cb("inference_started")

        if self.mode == "mock":
            time.sleep(0.5)
            if log_cb:
                log_cb("inference_completed")
            return {
                "answer": "[Mock croma] Cross-modal analysis complete. Optical-SAR embedding similarity: 0.7500 (moderate agreement). Spatially heterogeneous features detected. Mean joint activation: 1.2000, peak: 2.3000.",
                "confidence": None,
                "evidence": [
                    {
                        "type": "text",
                        "label": "Cross-modal cosine similarity (SAR ↔ Optical) (Mock)",
                        "url": "N/A",
                        "score": 0.75
                    }
                ]
            }

        self._ensure_loaded(log_cb)

        with self._lock:
            import torch
            from PIL import Image
            import numpy as np

            model = CROMAAdapter._shared_model

            # Load and preprocess optical image (image_a) → 12-channel at 120x120
            # For RGB input, we replicate to 12 channels as a practical demo approximation
            # (real Sentinel-2 would have 12 bands natively)
            optical_img = Image.open(image_path).convert('RGB')
            optical_img = optical_img.resize((120, 120))
            optical_np = np.array(optical_img, dtype=np.float32) / 255.0  # (120, 120, 3)
            # Replicate 3 RGB channels to approximate 12 Sentinel-2 bands
            optical_12ch = np.concatenate([optical_np] * 4, axis=2)  # (120, 120, 12)
            optical_tensor = torch.from_numpy(optical_12ch).permute(2, 0, 1).unsqueeze(0).cuda()  # (1, 12, 120, 120)

            # Load and preprocess SAR image (image_b) → 2-channel at 120x120
            sar_img = Image.open(image_b_path).convert('L')
            sar_img = sar_img.resize((120, 120))
            sar_np = np.array(sar_img, dtype=np.float32) / 255.0  # (120, 120)
            # Create 2-channel SAR (VV, VH approximation from single grayscale)
            sar_2ch = np.stack([sar_np, sar_np], axis=2)  # (120, 120, 2)
            sar_tensor = torch.from_numpy(sar_2ch).permute(2, 0, 1).unsqueeze(0).cuda()  # (1, 2, 120, 120)

            with torch.inference_mode():
                outputs = model(optical_images=optical_tensor, SAR_images=sar_tensor)

            result = self._analyze_embeddings(outputs)

            if log_cb:
                log_cb("inference_completed")

            return result
