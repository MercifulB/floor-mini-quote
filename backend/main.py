from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from vision import extract_takeoff_from_image_bytes
from quote import compute_quote

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/vision")
async def vision_endpoint(file: UploadFile = File(...), scale_ft_per_pixel: float = 0.02):
    image_bytes = await file.read()
    takeoff = extract_takeoff_from_image_bytes(image_bytes, scale_ft_per_pixel=scale_ft_per_pixel)
    return takeoff

@app.post("/quote")
async def quote_endpoint(payload: dict):
    return compute_quote(payload)
