"""
Diagnostic script to test CROMA memory usage and inference on RTX 4050 6GB.
"""
import os
import gc
import sys
import time
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

def run_real_memory_test(checkpoint_path: str):
    try:
        import torch
    except ImportError as e:
        print(f"Error: Required dependency missing ({e}).")
        return

    if not torch.cuda.is_available():
        print("Error: CUDA is not available. Cannot perform real GPU validation.")
        return
    
    repo_path = os.getenv("CROMA_REPO_PATH", "")
    if not repo_path:
        print("Error: CROMA_REPO_PATH environment variable is not set.")
        print("Please clone https://github.com/antofuller/CROMA and set CROMA_REPO_PATH to its location.")
        return
        
    use_croma_path = os.path.join(repo_path, "use_croma.py")
    if not os.path.exists(use_croma_path):
        print(f"Error: Cannot find use_croma.py at {use_croma_path}")
        return

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("use_croma", use_croma_path)
        use_croma = importlib.util.module_from_spec(spec)
        # Add the repo to sys.path so any internal relative imports in use_croma work
        if repo_path not in sys.path:
            sys.path.insert(0, repo_path)
        spec.loader.exec_module(use_croma)
        PretrainedCROMA = use_croma.PretrainedCROMA
    except Exception as e:
        print(f"Error: Cannot dynamically import PretrainedCROMA from {use_croma_path} ({e}).")
        import traceback
        traceback.print_exc()
        return

    print(f"\nAttempting to initialize PretrainedCROMA model...")
    
    try:
        t0 = time.time()
        
        # Ensure checkpoint exists
        if not checkpoint_path or not os.path.exists(checkpoint_path):
            print(f"Warning: No valid checkpoint found at '{checkpoint_path}'. Initializing model with uninitialized weights for testing.")
            checkpoint_path = None
        else:
            print(f"Loading checkpoint from: {checkpoint_path}")

        # Initialize model
        model = PretrainedCROMA(pretrained_path=checkpoint_path, size='base', modality='both', image_resolution=120)
        
        model = model.cuda()
        model.eval()
        
        load_time = time.time() - t0
        print(f"[SUCCESS] Model initialized and loaded in {load_time:.2f} seconds.")
        
        loaded_memory = torch.cuda.max_memory_allocated() / (1024 ** 3)
        print(f"VRAM used after load: {loaded_memory:.2f} GB")
        
        print("\nRunning dummy inference (Optical + SAR)...")
        # Dummy inputs representing Optical (12 channels) and SAR (2 channels) at 120x120
        # Batch size 1
        dummy_optical = torch.randn(1, 12, 120, 120).cuda()
        dummy_sar = torch.randn(1, 2, 120, 120).cuda()
        
        t1 = time.time()
        with torch.no_grad():
            outputs = model(SAR_images=dummy_sar, optical_images=dummy_optical)
        
        infer_time = time.time() - t1
        peak_memory = torch.cuda.max_memory_allocated() / (1024 ** 3)
        
        print(f"[SUCCESS] Inference completed in {infer_time:.4f} seconds.")
        print(f"Peak VRAM used during inference: {peak_memory:.2f} GB")
        print(f"Output type: {type(outputs)}")
        
        if isinstance(outputs, dict):
            print(f"Output keys: {list(outputs.keys())}")
            for k, v in outputs.items():
                if hasattr(v, 'shape'):
                    print(f"  {k} shape: {v.shape}")
                elif isinstance(v, (list, tuple)):
                    print(f"  {k} shapes: {[o.shape if hasattr(o, 'shape') else type(o) for o in v]}")
                else:
                    print(f"  {k} type: {type(v)}")
        else:
            print("Output was not a dictionary as expected.")
        
        # Cleanup
        del model
        del dummy_optical
        del dummy_sar
        del outputs
        gc.collect()
        torch.cuda.empty_cache()
        print("\nVRAM cleared safely.")
        
    except Exception as e:
        print(f"\n[FAILURE] Model loading or inference failed with exception:")
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CROMA Memory Diagnostic")
    parser.add_argument("--mode", choices=["dry-run", "real-gpu"], default="dry-run", 
                        help="Use 'real-gpu' to actually load the model and test VRAM.")
    parser.add_argument("--checkpoint", type=str, default="", 
                        help="Path to the downloaded CROMA_base.pt checkpoint.")
    args = parser.parse_args()

    get_sys_info()

    if args.mode == "dry-run":
        print("\n[DRY-RUN MODE]")
        print("Skipping actual model loading and inference to keep this CPU machine safe.")
        print("To perform the actual GPU VRAM test on the RTX 4050 machine, run:")
        print("python backend/scripts/test_croma_preflight.py --mode real-gpu --checkpoint C:\\path\\to\\CROMA_base.pt")
    elif args.mode == "real-gpu":
        print("\n[REAL-GPU MODE]")
        run_real_memory_test(args.checkpoint)
