import io

import httpx
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from app.config import settings

_model = None
_processor = None


def _get_model():
    global _model, _processor
    if _model is None:
        _model = CLIPModel.from_pretrained(settings.CLIP_MODEL)
        _processor = CLIPProcessor.from_pretrained(settings.CLIP_MODEL)
        _model.eval()
    return _model, _processor


def encode_image_from_url(url: str) -> list[float] | None:
    """Download an image from URL and return its CLIP embedding."""
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return encode_image(image)
    except Exception:
        return None


def encode_image(image: Image.Image) -> list[float]:
    """Return CLIP embedding for a PIL image."""
    model, processor = _get_model()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        feats = model.get_image_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.squeeze().tolist()
