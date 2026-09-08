import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "satquery-ai-backend"}

def test_analyze_invalid_mode():
    response = client.post(
        "/internal/analyze",
        data={"query": "test query", "mode": "invalid_mode"},
        files={"image_a": ("test.png", b"test data", "image/png")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"

def test_analyze_missing_query():
    response = client.post(
        "/internal/analyze",
        data={"query": "", "mode": "single"},
        files={"image_a": ("test.png", b"test data", "image/png")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"

def test_analyze_single_vqa():
    response = client.post(
        "/internal/analyze",
        data={"query": "What is in this image?", "mode": "single"},
        files={"image_a": ("test.png", b"test data", "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["task"] == "vqa"
    assert data["data"]["executionTrace"]["selectedTools"][0]["id"] == "geochat"
    # Verify stages
    stages = [s["stage"] for s in data["data"]["executionTrace"]["stages"]]
    assert "request_received" in stages
    assert "input_validated" in stages
    assert "task_selected" in stages
    assert "model_selected" in stages
    assert "inference_started" in stages
    assert "inference_completed" in stages
    assert "result_generated" in stages
    
    # Verify confidence is None for generative VQA
    assert data["data"]["confidence"] is None

def test_analyze_bi_temporal():
    response = client.post(
        "/internal/analyze",
        data={"query": "What changed?", "mode": "bi_temporal"},
        files={
            "image_a": ("test1.png", b"test data", "image/png"),
            "image_b": ("test2.png", b"test data", "image/png")
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["task"] == "change_analysis"
    assert data["data"]["executionTrace"]["selectedTools"][0]["id"] == "bit_cd"

def test_analyze_optical_sar():
    response = client.post(
        "/internal/analyze",
        data={"query": "Analyze water and buildings", "mode": "optical_sar"},
        files={
            "image_a": ("test1.png", b"test data", "image/png"),
            "image_b": ("test2.png", b"test data", "image/png")
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["task"] == "optical_sar_analysis"
    assert data["data"]["executionTrace"]["selectedTools"][0]["id"] == "croma"

def test_analyze_missing_image_b():
    response = client.post(
        "/internal/analyze",
        data={"query": "Analyze water and buildings", "mode": "optical_sar"},
        files={"image_a": ("test1.png", b"test data", "image/png")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"
    assert "requires image_b" in data["error"]["message"]

def test_analyze_invalid_file_extension():
    response = client.post(
        "/internal/analyze",
        data={"query": "What is in this image?", "mode": "single"},
        files={"image_a": ("test.txt", b"test data", "text/plain")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"
    assert "Unsupported format" in data["error"]["message"]

def test_geochat_local_gpu_no_cuda():
    import os
    from unittest import mock
    from app.models.adapters.geochat_adapter import GeoChatAdapter
    
    with mock.patch.dict(os.environ, {"ML_INFERENCE_MODE": "local_gpu"}):
        adapter = GeoChatAdapter()
        # Since CUDA is not available on this CPU machine, it should gracefully raise RuntimeError
        with pytest.raises(RuntimeError, match="CUDA is not available"):
            adapter.run(query="test", image_path="dummy.png")
