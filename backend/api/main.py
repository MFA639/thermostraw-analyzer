from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import numpy as np
import sys, os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.gaussian_process import ThermalConductivityPredictor

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

# ---------- UNE SEULE IMAGE EN MÉMOIRE ----------
chart_image_last: str | None = None    # base64 sans préfixe

# ---------- Modèles ----------
class GranulometricFractions(BaseModel):
    taux_2mm: float
    taux_1mm: float
    taux_500um: float
    taux_250um: float
    taux_0: float

class ChartImageRequest(BaseModel):
    fractions: Dict[str, float] | None = None
    chart_image: str

class LaboratoryMeasurement(BaseModel):
    fractions: GranulometricFractions
    lambda_value: float

# ---------- Endpoints ----------
@app.get("/")
def root():
    return {"message": "ThermoStraw API running"}

@app.post("/save-chart-image")
def save_chart(req: ChartImageRequest):
    global chart_image_last
    try:
        # stocke la dernière image (base64 sans entête)
        chart_image_last = req.chart_image.split(",")[-1]
        return {"message": "Image sauvegardée sous cleImage"}
    except Exception as e:
        raise HTTPException(500, f"Erreur save-chart: {e}")

@app.post("/predict-image")
def predict_image(fracs: GranulometricFractions):
    try:
        if chart_image_last is None:
            return {"chart_image": ""}   # aucun PNG dispo

        res = predictor.predict(**fracs.dict())
        measurements_history.append({
            "fractions": fracs.dict(),
            "prediction": {"lambda_predicted": res["lambda_predicted"],
                           "status": res["status"]},
            "timestamp": float(np.datetime64("now").astype("float64"))
        })
        return {
            "lambda_predicted": res["lambda_predicted"],
            "confidence_interval": res["confidence_interval"],
            "status": res["status"],
            "chart_image": "data:image/png;base64," + chart_image_last
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur predict-image: {e}")

@app.post("/add-laboratory-sample")
def add_sample(m: LaboratoryMeasurement):
    try:
        return predictor.add_sample(**m.fractions.dict(), lambda_value=m.lambda_value)
    except Exception as e:
        raise HTTPException(500, f"Erreur add-sample: {e}")
