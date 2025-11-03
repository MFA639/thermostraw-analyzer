"""
Script pour reconvertir le modèle avec la version NumPy du backend
"""
import joblib
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor

print(f"NumPy version: {np.__version__}")

# Charger le modèle original
print("Chargement du modèle original...")
try:
    model_data = joblib.load('modele_GP_conductivite_22lots.pkl')
    print("✅ Modèle chargé avec succès")

    # Sauvegarder avec la nouvelle version de NumPy
    print("Sauvegarde avec la version NumPy actuelle...")
    joblib.dump(model_data, 'backend/models/modele_GP_conductivite_22lots.pkl')
    print("✅ Modèle sauvegardé dans backend/models/")

except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
