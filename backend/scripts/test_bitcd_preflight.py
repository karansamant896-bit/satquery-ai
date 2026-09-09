"""
Diagnostic script to test BIT-CD memory usage and inference on RTX 4050 6GB.
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

class DummyArgs:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def run_real_memory_test(checkpoint_path: str):
    try:
        import torch
    except ImportError as e:
        print(f"Error: Required dependency missing ({e}).")
        return

    if not torch.cuda.is_available():
        print("Error: CUDA is not available. Cannot perform real GPU validation.")
        return
    
    # Pre-flight check for official BIT_CD module
    repo_path = os.getenv("BITCD_REPO_PATH", "")
    if not repo_path:
        print("Error: BITCD_REPO_PATH environment variable is not set.")
        print("Please clone https://github.com/justchenhao/BIT_CD and set BITCD_REPO_PATH to its location.")
        return
        
    if repo_path not in sys.path:
        sys.path.append(repo_path)

    try:
        from models.networks import define_G
    except ImportError as e:
        print(f"Error: Cannot import official BIT_CD modules ({e}).")
        print(f"Ensure BITCD_REPO_PATH points to the correct directory containing 'models'. Path tried: {repo_path}")
        return

    print(f"\nAttempting to initialize BIT-CD model...")
    
    # Standard BIT-CD arguments for LEVIR-CD
    args = DummyArgs(
        net_G='base_transformer_pos_s4_dd8_ded8',
        gpu_ids=[0],
        init_type='normal',
        init_gain=0.02
    )

    try:
        t0 = time.time()
        # Initialize model
        model = define_G(args=args, init_type='normal', init_gain=0.02, gpu_ids=[0])
        
        # Load weights if checkpoint provided
        if checkpoint_path and os.path.exists(checkpoint_path):
            print(f"Loading checkpoint from: {checkpoint_path}")
            state_dict = torch.load(checkpoint_path, map_location='cuda:0')
            model.load_state_dict(state_dict)
        else:
            print("No valid checkpoint_path provided. Running with uninitialized weights for VRAM test.")
            
        model = model.cuda()
        model.eval()
        
        load_time = time.time() - t0
        print(f"[SUCCESS] Model initialized and loaded in {load_time:.2f} seconds.")
        
        loaded_memory = torch.cuda.max_memory_allocated() / (1024 ** 3)
        print(f"VRAM used after load: {loaded_memory:.2f} GB")
        
        print("\nRunning dummy inference (256x256 crops)...")
        # Dummy inputs representing T1 and T2 remote sensing images
        dummy_t1 = torch.randn(1, 3, 256, 256).cuda()
        dummy_t2 = torch.randn(1, 3, 256, 256).cuda()
        
        t1 = time.time()
        with torch.no_grad():
            # BIT_CD uses lists of outputs, usually taking (T1, T2)
            outputs = model(dummy_t1, dummy_t2)
        
        infer_time = time.time() - t1
        peak_memory = torch.cuda.max_memory_allocated() / (1024 ** 3)
        
        print(f"[SUCCESS] Inference completed in {infer_time:.4f} seconds.")
        print(f"Peak VRAM used during inference: {peak_memory:.2f} GB")
        print(f"Output type: {type(outputs)}")
        
        if isinstance(outputs, (list, tuple)):
            print(f"Output shapes: {[o.shape for o in outputs]}")
        else:
            print(f"Output shape: {outputs.shape}")
        
        # Cleanup
        del model
        del dummy_t1
        del dummy_t2
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
    parser = argparse.ArgumentParser(description="BIT-CD Memory Diagnostic")
    parser.add_argument("--mode", choices=["dry-run", "real-gpu"], default="dry-run", 
                        help="Use 'real-gpu' to actually load the model and test VRAM.")
    parser.add_argument("--checkpoint", type=str, default="", 
                        help="Path to the downloaded BIT-CD .pth checkpoint.")
    args = parser.parse_args()

    get_sys_info()

    if args.mode == "dry-run":
        print("\n[DRY-RUN MODE]")
        print("Skipping actual model loading and inference to keep this machine safe.")
        print("To perform the actual GPU VRAM test on the RTX 4050 machine, clone the BIT_CD repo and run:")
        print("$env:BITCD_REPO_PATH=\"C:\\path\\to\\BIT_CD\"")
        print("python backend/scripts/test_bitcd_preflight.py --mode real-gpu --checkpoint C:\\path\\to\\best_model.pth")
    elif args.mode == "real-gpu":
        print("\n[REAL-GPU MODE]")
        run_real_memory_test(args.checkpoint)
