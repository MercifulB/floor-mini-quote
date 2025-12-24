from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np


@dataclass
class Detection:
    label: str
    x1: int
    y1: int
    x2: int
    y2: int
    score: float


def _to_gray(img_bgr: np.ndarray) -> np.ndarray:
    if len(img_bgr.shape) == 2:
        return img_bgr
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)


def _edges(gray: np.ndarray) -> np.ndarray:
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.Canny(gray, 50, 150)


def _load_templates_from_folder(folder: Path, max_templates: int = 60) -> List[np.ndarray]:
    if not folder.exists():
        return []

    image_paths = sorted(folder.glob("*.jpg"))
    if max_templates and len(image_paths) > max_templates:
        image_paths = image_paths[:max_templates]

    templates: List[np.ndarray] = []
    for p in image_paths:
        img = cv2.imread(str(p), cv2.IMREAD_COLOR)
        if img is None:
            continue

        g = _to_gray(img)
        e = _edges(g)

        # skip mostly blank templates
        if float(np.mean(e)) < 1.0:
            continue

        templates.append(e)

    return templates


def load_symbol_templates(dataset_root: str) -> Dict[str, List[np.ndarray]]:
    """
    dataset_root points to: cv_training/data/furnishing-dataset/FDS
    """
    root = Path(dataset_root)
    train = root / "train"

    mapping = {
        "window": train / "WINDOW",
        "door_single": train / "DOOR-SINGLE",
        "door_double": train / "DOOR-DOUBLE",
        "door_windowed": train / "DOOR-WINDOWED",
    }

    templates: Dict[str, List[np.ndarray]] = {}
    for label, folder in mapping.items():
        templates[label] = _load_templates_from_folder(folder, max_templates=60)

    return templates


def _iou(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)

    denom = float(area_a + area_b - inter_area + 1e-9)
    return float(inter_area / denom)


def nms(dets: List[Detection], iou_thresh: float = 0.35) -> List[Detection]:
    if not dets:
        return []

    dets_sorted = sorted(dets, key=lambda d: d.score, reverse=True)
    kept: List[Detection] = []

    for d in dets_sorted:
        box_d = (d.x1, d.y1, d.x2, d.y2)
        ok = True
        for k in kept:
            if k.label != d.label:
                continue
            box_k = (k.x1, k.y1, k.x2, k.y2)
            if _iou(box_d, box_k) >= iou_thresh:
                ok = False
                break
        if ok:
            kept.append(d)

    return kept


def match_symbols_on_plan(
    plan_bgr: np.ndarray,
    templates: Dict[str, List[np.ndarray]],
    scales: List[float] | None = None,
    score_threshold: float = 0.58,
    max_hits_per_template: int = 40,
) -> List[Detection]:
    if scales is None:
        scales = [0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 1.1, 1.25, 1.4, 1.6]

    plan_gray = _to_gray(plan_bgr)
    plan_edge = _edges(plan_gray)

    H, W = plan_edge.shape[:2]
    detections: List[Detection] = []

    for label, t_list in templates.items():
        for t in t_list:
            th, tw = t.shape[:2]

            for s in scales:
                rw = int(tw * s)
                rh = int(th * s)
                if rw < 12 or rh < 12:
                    continue
                if rw >= W or rh >= H:
                    continue

                t_resized = cv2.resize(t, (rw, rh), interpolation=cv2.INTER_AREA)

                if float(np.std(t_resized)) < 5.0:
                    continue

                res = cv2.matchTemplate(plan_edge, t_resized, cv2.TM_CCOEFF_NORMED)

                ys, xs = np.where(res >= score_threshold)
                if len(xs) == 0:
                    continue

                scores = res[ys, xs]
                idx = np.argsort(scores)[::-1][:max_hits_per_template]

                for i in idx:
                    x = int(xs[i])
                    y = int(ys[i])
                    score = float(scores[i])
                    detections.append(
                        Detection(
                            label=label,
                            x1=x,
                            y1=y,
                            x2=x + rw,
                            y2=y + rh,
                            score=score,
                        )
                    )

    return nms(detections, iou_thresh=0.35)
