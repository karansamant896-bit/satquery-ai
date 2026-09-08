import os
import time
import sys
import threading
from typing import Dict, Any

class GeoChatAdapter:
    _lock = threading.Lock()
    _shared_model = None
    _shared_tokenizer = None
    _shared_image_processor = None

    def __init__(self):
        self.model_id = os.getenv("GEOCHAT_MODEL_ID", "MBZUAI/geochat-7B")
        self.repo_path = os.getenv("GEOCHAT_REPO_PATH", "")
        self.mode = os.getenv("ML_INFERENCE_MODE", "mock").lower()
        self.is_loaded = False

    def _ensure_loaded(self, log_cb=None):
        if self.mode == "mock":
            return
            
        with self._lock:
            if GeoChatAdapter._shared_model is not None:
                self.is_loaded = True
                return

            if log_cb:
                log_cb("model_loading_started")
            
            try:
                import torch
                if not torch.cuda.is_available():
                    raise RuntimeError("CUDA is not available. Cannot initialize GeoChat in local_gpu mode.")
            except ImportError:
                raise RuntimeError("CUDA is not available (PyTorch not installed). Cannot initialize GeoChat in local_gpu mode.")
            
            if self.repo_path and self.repo_path not in sys.path:
                sys.path.append(self.repo_path)
            
            # The official GeoChat import logic
            try:
                from geochat.model.builder import load_pretrained_model
                from geochat.utils import disable_torch_init
                disable_torch_init()

                # Load model
                tokenizer, model, image_processor, context_len = load_pretrained_model(
                    model_path=self.model_id,
                    model_base=None,
                    model_name=self.model_id.split("/")[-1],
                    load_8bit=False,
                    load_4bit=True,
                    device_map="auto"
                )
                
                GeoChatAdapter._shared_model = model
                GeoChatAdapter._shared_tokenizer = tokenizer
                GeoChatAdapter._shared_image_processor = image_processor
                
            except ImportError as e:
                raise ImportError(f"Failed to import official GeoChat modules. Ensure GEOCHAT_REPO_PATH is correct. ({e})")
            
            self.is_loaded = True
            if log_cb:
                log_cb("model_loaded")

    def run(self, query: str, image_path: str = None, log_cb=None, **kwargs) -> Dict[str, Any]:
        if log_cb:
            log_cb("inference_started")

        if self.mode == "mock":
            time.sleep(0.5)
            if log_cb:
                log_cb("inference_completed")
            return {
                "answer": f"[Mock geochat] Analyzed query: '{query}'",
                "confidence": None,
                "evidence": []
            }

        self._ensure_loaded(log_cb)

        with self._lock:
            from geochat.mm_utils import tokenizer_image_token, KeywordsStoppingCriteria
            from geochat.constants import IMAGE_TOKEN_INDEX
            from geochat.conversation import conv_templates, SeparatorStyle
            from PIL import Image
            import torch
            
            model = GeoChatAdapter._shared_model
            tokenizer = GeoChatAdapter._shared_tokenizer
            image_processor = GeoChatAdapter._shared_image_processor
            
            conv_mode = "llava_v1"
            conv = conv_templates[conv_mode].copy()

            if image_path:
                image = Image.open(image_path).convert('RGB')
                image_tensor = image_processor.preprocess(image, return_tensors='pt')['pixel_values'].half().cuda()
                inp = "<image>\n" + query
            else:
                inp = query
                image_tensor = None

            conv.append_message(conv.roles[0], inp)
            conv.append_message(conv.roles[1], None)
            prompt = conv.get_prompt()

            input_ids = tokenizer_image_token(prompt, tokenizer, IMAGE_TOKEN_INDEX, return_tensors='pt').unsqueeze(0).cuda()
            
            stop_str = conv.sep if conv.sep_style != SeparatorStyle.TWO else conv.sep2
            keywords = [stop_str]
            stopping_criteria = KeywordsStoppingCriteria(keywords, tokenizer, input_ids)

            with torch.inference_mode():
                output_ids = model.generate(
                    input_ids,
                    images=image_tensor,
                    do_sample=False,
                    temperature=0.0,
                    max_new_tokens=120,
                    use_cache=True,
                    stopping_criteria=[stopping_criteria]
                )

            input_token_len = input_ids.shape[1]
            outputs = tokenizer.batch_decode(output_ids[:, input_token_len:], skip_special_tokens=True)[0]
            outputs = outputs.strip()
            if outputs.endswith(stop_str):
                outputs = outputs[:-len(stop_str)]
            outputs = outputs.strip()

            if log_cb:
                log_cb("inference_completed")

            return {
                "answer": outputs,
                "confidence": None,
                "evidence": []
            }
