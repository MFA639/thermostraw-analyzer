from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import numpy as np
import sys, os

# Ajout du chemin pour l'import (Railway-compatible)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import corrigé - essaie plusieurs chemins
try:
    # Essaie d'abord l'import relatif pour Railway
    from models.gaussian_process_archive import ThermalConductivityPredictor
except ImportError:
    try:
        # Si ça échoue, essaie l'import avec backend pour le développement local
        from backend.models.gaussian_process_archive import ThermalConductivityPredictor
    except ImportError:
        # Dernier recours : import direct
        import gaussian_process_archive
        ThermalConductivityPredictor = gaussian_process_archive.ThermalConductivityPredictor

app = FastAPI(title="ThermoStraw Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration globale
ADMIN_PIN = "1234"  # Changez ce PIN pour la sécurité
CURRENT_THRESHOLD = 0.045  # Seuil initial

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

class PinVerificationRequest(BaseModel):
    pin: str

class ThresholdUpdateRequest(BaseModel):
    pin: str
    threshold: float

# ---------- Endpoints ----------
@app.get("/")
def root():
    return {"message": "ThermoStraw API running"}

@app.get("/current-threshold")
def get_current_threshold():
    """Récupère le seuil actuel"""
    return {"threshold": CURRENT_THRESHOLD}

@app.post("/verify-pin")
def verify_pin(request: PinVerificationRequest):
    """Vérifie le PIN administrateur"""
    return {"valid": request.pin == ADMIN_PIN}

@app.post("/update-threshold")
def update_threshold(request: ThresholdUpdateRequest):
    """Met à jour le seuil de conformité (protégé par PIN)"""
    global CURRENT_THRESHOLD
    
    # Vérification du PIN
    if request.pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="PIN incorrect")
    
    # Validation du seuil
    if request.threshold <= 0 or request.threshold > 0.1:
        raise HTTPException(status_code=400, detail="Seuil invalide (doit être entre 0.001 et 0.1)")
    
    # Mise à jour du seuil
    CURRENT_THRESHOLD = request.threshold
    
    return {
        "success": True,
        "new_threshold": CURRENT_THRESHOLD,
        "message": f"Seuil mis à jour à {CURRENT_THRESHOLD:.3f} W/m·K"
    }

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
        # Calculer la prédiction
        res = predictor.predict(**fracs.dict())
        
        # Appliquer le seuil global pour déterminer le statut
        lambda_pred = res["lambda_predicted"]
        status = "conforme" if lambda_pred <= CURRENT_THRESHOLD else "non_conforme"
        
        # Ajouter à l'historique
        measurements_history.append({
            "fractions": fracs.dict(),
            "prediction": {
                "lambda_predicted": lambda_pred,
                "status": status,
                "threshold_used": CURRENT_THRESHOLD
            },
            "timestamp": float(np.datetime64("now").astype("float64"))
        })
        
        # Renvoyer les données de prédiction + l'image
        return {
            "lambda_predicted": lambda_pred,
            "confidence_interval": res["confidence_interval"],
            "status": status,  # Utiliser le statut basé sur le seuil global
            "r1p_log": res.get("r1p_log"),
            "ee_best": res.get("ee_best"),
            "threshold": CURRENT_THRESHOLD,  # Inclure le seuil utilisé
            "optimal_ranges": res.get("optimal_ranges", {
                "taux_2mm": [12, 18],
                "taux_1mm": [53, 58],
                "taux_500um": [19, 24],
                "taux_250um": [4, 7],
                "taux_0": [0, 1]
            }),
            "chart_image": "data:image/png;base64," + chart_image_last if chart_image_last else ""
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur predict-image: {e}")

@app.post("/add-laboratory-sample")
def add_sample(m: LaboratoryMeasurement):
    try:
        return predictor.add_sample(**m.fractions.dict(), lambda_value=m.lambda_value)
    except Exception as e:
        raise HTTPException(500, f"Erreur add-sample: {e}")

@app.get("/admin/history")
def get_measurements_history(pin: str):
    """Récupère l'historique des mesures (protégé par PIN)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="PIN incorrect")
    
    return {
        "measurements": measurements_history,
        "count": len(measurements_history),
        "current_threshold": CURRENT_THRESHOLD
    }