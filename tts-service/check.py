import torch
import time

print("--- DIAGNOSTIC CHECK ---")
print(f"1. Python thinks CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"2. GPU Name: {torch.cuda.get_device_name(0)}")
    
    # Test a real calculation
    print("3. Testing actual GPU speed...")
    try:
        # Move a tiny tensor to GPU
        x = torch.rand(10000, 10000).to("cuda")
        start = time.time()
        # Force a heavy matrix multiplication
        y = torch.matmul(x, x)
        end = time.time()
        print(f"✅ GPU Calculation succesful! Time: {end - start:.4f} seconds")
        print("(If this was < 0.2 seconds, your GPU is working perfectly)")
    except Exception as e:
        print(f"❌ GPU Error: {e}")
else:
    print("❌ STARTUP ERROR: PyTorch cannot see your GPU at all.")

print("------------------------")