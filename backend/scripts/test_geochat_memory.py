"""
Diagnostic script to test GeoChat 4-bit memory usage on RTX 4050 6GB.
"""
import os
import gc
import sys
import argparse

def get_sys_info():
    print("=== System Info ===")
    print(f"Python Version: {sys.version.split(' ')[0]}")
    try:
        import torch
        print(f"PyTorch Version: {torch.__version__}")
        if torch.cuda.is_available():
            print(f"CUDA Available: True")
            device = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(device)
            total_vram = props.total_memory / (1024 ** 3)
            print(f"GPU Name: {torch.cuda.get_device_name(device)}")
            print(f"Total VRAM: {total_vram:.2f} GB")
        else:
            print("CUDA Available: False")
    except ImportError:
        print("PyTorch not installed.")
    print("===================")

def run_real_memory_test():
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    except ImportError as e:
        print(f"Error: Required dependency missing ({e}).")
        print("Please run: pip install -r requirements-ml.txt")
        return

    if not torch.cuda.is_available():
        print("Error: CUDA is not available. Cannot perform real GPU validation.")
        return
    
    model_id = "MBZUAI/geochat-7B"
    
    print(f"\nAttempting to load {model_id} in 4-bit mode...")
    print("This will download the weights if not cached and consume VRAM.")
    
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )

    try:
        # Load the model
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True
        )
        print("\n[SUCCESS] Model loaded successfully into VRAM.")
        
        peak_memory = torch.cuda.max_memory_allocated() / (1024 ** 3)
        print(f"Peak VRAM used during load: {peak_memory:.2f} GB")
        
        # Cleanup
        del model
        del tokenizer
        gc.collect()
        torch.cuda.empty_cache()
        print("VRAM cleared.")
        
    except Exception as e:
        print(f"\n[FAILURE] Model loading failed with exception:")
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GeoChat Memory Diagnostic")
    parser.add_argument("--mode", choices=["dry-run", "real-gpu"], default="dry-run", 
                        help="Use 'real-gpu' to actually download and load the model.")
    args = parser.parse_args()

    get_sys_info()

    if args.mode == "dry-run":
        print("\n[DRY-RUN MODE]")
        print("Skipping actual model download and instantiation to keep this machine safe.")
        print("To perform the actual GPU VRAM test on the RTX 4050 machine, run:")
        print("python test_geochat_memory.py --mode real-gpu")
    elif args.mode == "real-gpu":
        print("\n[REAL-GPU MODE]")
        run_real_memory_test()
