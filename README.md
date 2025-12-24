# Floor Mini Quote

A lightweight demo inspired by Latii: upload a floor plan, extract a basic takeoff (windows and doors) using computer vision, generate a quote range using explicit pricing rules, and ask a chat agent questions grounded in the takeoff and quote settings.

## What it does
- **Vision takeoff:** detects door and window symbols on floor plans and returns counts plus detection metadata.
- **Quote engine:** produces a low and high estimate based on takeoff counts and selected settings (material, installation).
- **Chat agent:** answers questions using the current takeoff, pricing rules, and quote settings.

## Tech stack
- **Frontend:** Next.js (App Router), TypeScript
- **Backend:** FastAPI
- **CV:** OpenCV template matching with a symbol template library (Furnishing Dataset)
- **Pricing:** simple rule based logic (no ML)

## Repo structure
- `frontend/` Next.js app
- `backend/` FastAPI server
- `cv_training/` dataset utilities and CV experiments

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
