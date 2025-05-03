from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import numpy as np
import sys, os

# ───────── Imports internes ─────────
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.gaussian_process import ThermalConductivityPredictor

# ───────── Application ─────────
app = FastAPI(title="ThermoStraw Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = ThermalConductivityPredictor()
measurements_history: List[dict] = []
chart_images: Dict[str, str] = {}   # clé = fractions normalisées → base64

# ───────── Modèles Pydantic ─────────
class GranulometricFractions(BaseModel):
    taux_2mm: float
    taux_1mm: float
    taux_500um: float
    taux_250um: float
    taux_0: float

class ChartImageRequest(BaseModel):
    fractions: GranulometricFractions
    chart_image: str                  # base64 (data URI acceptée)

class LaboratoryMeasurement(BaseModel):
    fractions: GranulometricFractions
    lambda_value: float

class PredictionResult(BaseModel):
    lambda_predicted: float
    confidence_interval: float
    status: str
    optimal_ranges: Dict[str, List[float]]

# ───────── Helpers ─────────
def make_key(fr: dict) -> str:
    """Clé cohérente pour stocker/retrouver l’image."""
    return "_".join(f"{k}_{float(v):.1f}" for k, v in sorted(fr.items()))

# ───────── Endpoints ─────────
@app.get("/")
def root():
    return {"message": "ThermoStraw API running"}

@app.post("/predict", response_model=PredictionResult)
def predict(fractions: GranulometricFractions):
    try:
        if any(v < 0 for v in fractions.dict().values()):
            raise HTTPException(400, "Les fractions doivent être positives")
        result = predictor.predict(**fractions.dict())
        measurements_history.append({
            "fractions": fractions.dict(),
            "prediction": {"lambda_predicted": result["lambda_predicted"],
                           "status": result["status"]},
            "timestamp": float(np.datetime64("now").astype("float64"))
        })
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erreur de prédiction: {e}")

@app.post("/save-chart-image")
def save_chart(req: ChartImageRequest):
    try:
        key = make_key(req.fractions.dict())
        chart_images[key] = req.chart_image.split(",")[-1]   # stocke juste le base64
        return {"message": "Image sauvegardée", "key": key}
    except Exception as e:
        raise HTTPException(500, f"Erreur save-chart: {e}")

@app.post("/predict-image")
def predict_image(fracs: GranulometricFractions):
    try:
        key = make_key(fracs.dict())
        img = chart_images.get(key, "")
        result = predictor.predict(**fracs.dict())
        measurements_history.append({
            "fractions": fracs.dict(),
            "prediction": {"lambda_predicted": result["lambda_predicted"],
                           "status": result["status"]},
            "timestamp": float(np.datetime64("now").astype("float64"))
        })
        return {
            "lambda_predicted": result["lambda_predicted"],
            "confidence_interval": result["confidence_interval"],
            "status": result["status"],
            "chart_image": f"data:image/png;base64,{img}" if img else ""
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur predict-image: {e}")

@app.post("/add-laboratory-sample")
def add_sample(m: LaboratoryMeasurement):
    try:
        res = predictor.add_sample(**m.fractions.dict(), lambda_value=m.lambda_value)
        return res
    except Exception as e:
        raise HTTPException(500, f"Erreur add-sample: {e}")
