from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
import numpy as np
import sys
import os
import io
import base64
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Utilisation du backend non-interactif

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

# Modèles de données
class GranulometricFractions(BaseModel):
    taux_2mm: float
    taux_1mm: float
    taux_500um: float
    taux_250um: float
    taux_0: float

class LaboratoryMeasurement(BaseModel):
    fractions: GranulometricFractions
    lambda_value: float

class PredictionResult(BaseModel):
    lambda_predicted: float
    confidence_interval: float
    status: str
    optimal_ranges: Dict[str, List[float]]

class PredictionImageResult(BaseModel):
    lambda_predicted: float
    confidence_interval: float
    status: str
    chart_image: str  # Image en base64

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

@app.post("/predict-image")
def predict_image(fractions: GranulometricFractions):
    """
    Prédit la conductivité thermique et renvoie l'image du graphique
    Cette fonction est utilisée par l'intégration Google Sheets
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
        
        # Création du graphique
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Données pour le graphique
        fractions_data = [
            {"name": "> 2mm", "value": fractions.taux_2mm, "min": result["optimal_ranges"]["taux_2mm"][0], "max": result["optimal_ranges"]["taux_2mm"][1]},
            {"name": "1-2mm", "value": fractions.taux_1mm, "min": result["optimal_ranges"]["taux_1mm"][0], "max": result["optimal_ranges"]["taux_1mm"][1]},
            {"name": "500μm-1mm", "value": fractions.taux_500um, "min": result["optimal_ranges"]["taux_500um"][0], "max": result["optimal_ranges"]["taux_500um"][1]},
            {"name": "250-500μm", "value": fractions.taux_250um, "min": result["optimal_ranges"]["taux_250um"][0], "max": result["optimal_ranges"]["taux_250um"][1]},
            {"name": "< 250μm", "value": fractions.taux_0, "min": result["optimal_ranges"]["taux_0"][0], "max": result["optimal_ranges"]["taux_0"][1]}
        ]
        
        # Préparation des données pour le graphique à barres
        names = [item["name"] for item in fractions_data]
        values = [item["value"] for item in fractions_data]
        
        # Définition des couleurs selon si la valeur est dans la plage optimale
        colors = []
        for item in fractions_data:
            if item["value"] >= item["min"] and item["value"] <= item["max"]:
                colors.append('green')
            else:
                colors.append('red')
        
        # Création du graphique à barres
        bars = ax.bar(names, values, color=colors)
        
        # Ajout des lignes pour les plages optimales
        for i, item in enumerate(fractions_data):
            ax.plot([i-0.4, i+0.4], [item["min"], item["min"]], 'k--', alpha=0.7)
            ax.plot([i-0.4, i+0.4], [item["max"], item["max"]], 'k--', alpha=0.7)
            
            # Étiquettes avec les valeurs
            ax.text(i, item["value"] + 0.5, f"{item['value']:.1f}%", 
                    ha='center', va='bottom', fontsize=10)
        
        # Paramétrage du graphique
        ax.set_ylabel('Pourcentage (%)')
        ax.set_title('Distribution granulométrique vs plages optimales')
        ax.set_ylim(0, max(values) * 1.2)  # Espace pour les étiquettes
        
        # Ajout d'une légende pour la prédiction
        lambda_text = f"λ prédit: {result['lambda_predicted']:.4f} W/m·K"
        status_color = {'green': 'green', 'orange': 'orange', 'red': 'red'}[result['status']]
        ax.text(0.5, 0.01, lambda_text, transform=ax.transAxes, ha='center',
                bbox=dict(facecolor=status_color, alpha=0.2), fontsize=12)
        
        # Création d'une image en base64
        buf = io.BytesIO()
        fig.tight_layout()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Enregistrement de la mesure dans l'historique
        measurements_history.append({
            "fractions": fractions.dict(),
            "prediction": {
                "lambda_predicted": result["lambda_predicted"],
                "status": result["status"]
            },
            "timestamp": float(np.datetime64('now').astype('float64'))
        })
        
        # Préparation de la réponse
        return {
            "lambda_predicted": result["lambda_predicted"],
            "confidence_interval": result["confidence_interval"],
            "status": result["status"],
            "chart_image": img_base64
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