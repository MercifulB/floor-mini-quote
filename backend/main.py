from fastapi import FastAPI, UploadFile, File, Form
from vision import extract_takeoff_from_image_bytes

from fastapi.middleware.cors import CORSMiddleware

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
async def vision(file: UploadFile = File(...), scale_ft_per_pixel: float = Form(...)):
  image_bytes = await file.read()
  result = extract_takeoff_from_image_bytes(image_bytes, float(scale_ft_per_pixel))
  return result

@app.post("/quote")
async def quote_endpoint(payload: dict):
    return compute_quote(payload)
