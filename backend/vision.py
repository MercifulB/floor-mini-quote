import io
import numpy as np
import cv2
from PIL import Image

def _to_cv2_bgr(image_bytes: bytes) -> np.ndarray:
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(pil_img)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    return bgr

def extract_takeoff_from_image_bytes(image_bytes: bytes, scale_ft_per_pixel: float = 0.02) -> dict:
    img = _to_cv2_bgr(image_bytes)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    edges = cv2.Canny(blur, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    windows = []
    doors = []
    idx_w = 1
    idx_d = 1

    h_img, w_img = gray.shape[:2]

    for c in contours:
        area = cv2.contourArea(c)
        if area < 500:
            continue

        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) != 4:
            continue

        x, y, w, h = cv2.boundingRect(approx)

        if w < 15 or h < 15:
            continue
        if x <= 0 or y <= 0 or x + w >= w_img or y + h >= h_img:
            continue

        aspect = w / float(h)

        width_ft = round(w * scale_ft_per_pixel, 2)
        height_ft = round(h * scale_ft_per_pixel, 2)

        confidence = 0.60
        if 0.7 <= aspect <= 1.6:
            confidence = 0.75
        if 1.6 < aspect <= 3.2:
            confidence = 0.78

        item = {
            "bbox": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
            "width_ft": width_ft,
            "height_ft": height_ft,
            "confidence": confidence
        }

        if aspect > 1.6:
            item["id"] = f"W{idx_w}"
            idx_w += 1
            windows.append(item)
        else:
            item["id"] = f"D{idx_d}"
            idx_d += 1
            doors.append(item)

    uncertainty = []
    if scale_ft_per_pixel <= 0:
        uncertainty.append("Scale is not set.")
    if len(windows) + len(doors) == 0:
        uncertainty.append("No rectangular features detected. Try a different plan image.")

    return {
        "project": {"name": "Demo Project", "units": "ft", "scale_ft_per_pixel": scale_ft_per_pixel},
        "takeoff": {"windows": windows, "doors": doors},
        "uncertainty": uncertainty
    }
