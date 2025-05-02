from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import numpy as np
import sys
import os
import base64

# Ajout du répertoire parent au path pour l'importation
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.gaussian_process import ThermalConductivityPredictor

app = FastAPI(title="ThermoStraw Analyzer API")

# Configuration du CORS pour permettre les requêtes du frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation du modèle
predictor = ThermalConductivityPredictor()

# Historique des mesures (en mémoire pour simplifier)
measurements_history = []
chart_images = {}  # Pour stocker temporairement les images des graphiques

# Modèles de données
class GranulometricFractions(BaseModel):
    taux_2mm: float
    taux_1mm: float
    taux_500um: float
    taux_250um: float
    taux_0: float

class ChartImageRequest(BaseModel):
    fractions: GranulometricFractions
    chart_image: str  # Base64 encoded image

class LaboratoryMeasurement(BaseModel):
    fractions: GranulometricFractions
    lambda_value: float

class PredictionResult(BaseModel):
    lambda_predicted: float
    confidence_interval: float
    status: str
    optimal_ranges: Dict[str, List[float]]

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API ThermoStraw Analyzer"}

@app.post("/predict", response_model=PredictionResult)
def predict_conductivity(fractions: GranulometricFractions):
    """
    Prédit la conductivité thermique à partir des fractions granulométriques
    """
    try:
        # Vérification que les fractions sont positives
        for fraction_name, value in fractions.dict().items():
            if value < 0:
                raise HTTPException(status_code=400, detail=f"La fraction {fraction_name} ne peut pas être négative")
        
        # Prédiction
        result = predictor.predict(
            fractions.taux_2mm,
            fractions.taux_1mm,
            fractions.taux_500um,
            fractions.taux_250um,
            fractions.taux_0
        )
        
        # Enregistrement de la mesure dans l'historique
        measurements_history.append({
            "fractions": fractions.dict(),
            "prediction": {
                "lambda_predicted": result["lambda_predicted"],
                "status": result["status"]
            },
            "timestamp": float(np.datetime64('now').astype('float64'))
        })
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")

@app.post("/save-chart-image")
def save_chart_image(request: ChartImageRequest):
    """
    Reçoit et stocke l'image du graphique capturée par le frontend
    """
    try:
        # Créer une clé unique pour cette combinaison de fractions
        fractions = request.fractions.dict()
        fractions_key = "_".join([f"{k}_{v}" for k, v in fractions.items()])
        
        # Stocker l'image
        chart_images[fractions_key] = request.chart_image
        
        return {"message": "Image enregistrée avec succès", "key": fractions_key}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement de l'image: {str(e)}")

@app.post("/predict-image")
def predict_image(fractions: GranulometricFractions):
    """
    Prédit la conductivité thermique et renvoie l'image du graphique pour Google Sheets
    """
    try:
        # Vérification que les fractions sont positives
        for fraction_name, value in fractions.dict().items():
            if value < 0:
                raise HTTPException(status_code=400, detail=f"La fraction {fraction_name} ne peut pas être négative")
        
        # Prédiction
        result = predictor.predict(
            fractions.taux_2mm,
            fractions.taux_1mm,
            fractions.taux_500um,
            fractions.taux_250um,
            fractions.taux_0
        )
        
        # Créer une clé unique pour cette combinaison de fractions
        fractions_dict = fractions.dict()
        fractions_key = "_".join([f"{k}_{v}" for k, v in fractions_dict.items()])
        
        # Récupérer l'image si elle existe
        chart_image = chart_images.get(fractions_key, "")
        
        # Enregistrement de la mesure dans l'historique
        measurements_history.append({
            "fractions": fractions_dict,
            "prediction": {
                "lambda_predicted": result["lambda_predicted"],
                "status": result["status"]
            },
            "timestamp": float(np.datetime64('now').astype('float64'))
        })
        
        # Préparer la réponse
        return {
            "lambda_predicted": result["lambda_predicted"],
            "confidence_interval": result["confidence_interval"],
            "status": result["status"],
            "chart_image": chart_image
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")

@app.post("/add-laboratory-sample")
def add_laboratory_sample(measurement: LaboratoryMeasurement):
    """
    Ajoute un échantillon mesuré en laboratoire et met à jour le modèle
    """
    try:
        fractions = measurement.fractions
        
        result = predictor.add_sample(
            fractions.taux_2mm,
            fractions.taux_1mm,
            fractions.taux_500um,
            fractions.taux_250um,
            fractions.taux_0,
            measurement.lambda_value
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout de l'échantillon: {str(e)}")

@app.get("/history")
def get_history():
    """
    Récupère l'historique des mesures
    """
    return measurements_history

@app.get("/export-csv")
def export_csv():
    """
    Exporte l'historique des mesures au format CSV
    """
    if not measurements_history:
        raise HTTPException(status_code=404, detail="Aucune donnée disponible pour l'export")
    
    import pandas as pd
    from fastapi.responses import StreamingResponse
    from io import StringIO
    
    # Préparation des données
    data = []
    for entry in measurements_history:
        row = {
            "timestamp": entry["timestamp"],
            "lambda_predicted": entry["prediction"]["lambda_predicted"],
            "status": entry["prediction"]["status"],
        }
        row.update(entry["fractions"])
        data.append(row)
    
    # Création du dataframe
    df = pd.DataFrame(data)
    
    # Conversion en CSV
    csv_content = StringIO()
    df.to_csv(csv_content, index=False)
    csv_content.seek(0)
    
    # Préparation de la réponse
    return StreamingResponse(
        iter([csv_content.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=thermostraw-data.csv"}
    )