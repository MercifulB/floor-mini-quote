from __future__ import annotations

import os
from typing import Any, Dict

import cv2
import numpy as np

from template_matcher import load_symbol_templates, match_symbols_on_plan

DATASET_ROOT = os.getenv("FDS_ROOT", "cv_training/data/furnishing-dataset/FDS")
TEMPLATES = load_symbol_templates(DATASET_ROOT)


def extract_takeoff_from_image_bytes(image_bytes: bytes, scale_ft_per_pixel: float) -> Dict[str, Any]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes")

    # ✅ downscale big plans for speed
    max_dim = int(os.getenv("TM_MAX_DIM", "1400"))  # try 1200–1800
    h, w = img.shape[:2]
    resize_scale = min(1.0, max_dim / max(h, w))
    if resize_scale < 1.0:
        img = cv2.resize(
            img,
            (int(w * resize_scale), int(h * resize_scale)),
            interpolation=cv2.INTER_AREA,
        )

    dets = match_symbols_on_plan(
        img,
        TEMPLATES,
        score_threshold=float(os.getenv("TM_SCORE", "0.58")),
    )

    window_count = sum(1 for d in dets if d.label == "window")
    door_count = sum(1 for d in dets if d.label.startswith("door_"))

    takeoff = {"windows": window_count, "doors": door_count}

    detections = [
        {"label": d.label, "bbox": [d.x1, d.y1, d.x2, d.y2], "score": round(d.score, 3)}
        for d in dets
    ]

    uncertainty = []
    if window_count == 0:
        uncertainty.append("No windows detected. The floor plan style may differ from the template library.")
    if door_count == 0:
        uncertainty.append("No doors detected. Try increasing TM_SCORE sensitivity or use a clearer plan image.")

    return {
        "takeoff": takeoff,
        "detections": detections,
        "uncertainty": uncertainty,
        "meta": {
            "scale_ft_per_pixel": scale_ft_per_pixel,
            "resize_scale": resize_scale,
            "template_counts": {k: len(v) for k, v in TEMPLATES.items()},
        },
    }
