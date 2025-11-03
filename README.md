# Thermostraw Analyzer

Modélisation et prédiction de la conductivité thermique des matériaux biosourcés à partir de leur distribution granulométrique.  
Le dépôt combine :
- Le **backend FastAPI** déployé sur Railway (`backend/`) ;
- Le **frontend** statique (`frontend/`) ;
- Les **scripts de modélisation** utilisés pour entraîner et régénérer le modèle (`Scriptmodelisation.py`, `create_compatible_model.py`, etc.).

---

## 1. Structure du dépôt

```
.
├── backend/                      # API FastAPI utilisée en production Railway
│   ├── api/main.py               # Endpoints publics
│   ├── models/                   # Modèles ML sérialisés + helpers de chargement
│   └── requirements.txt          # Dépendances côté backend
├── frontend/                     # Application web (service derive-labda)
├── dataset/datasetConductivite.xlsx
├── Scriptmodelisation.py         # Script complet d'entraînement / calibration
├── create_compatible_model.py    # Recrée un pickle compatible Railway
├── convert_model.py              # Re-sérialise un pickle existant avec NumPy local
├── requirements.txt              # Dépendances communes (build Railway)
├── README.md                     # Ce document
├── DEPLOYMENT.md                 # Guide détaillé Railway
└── QUICKSTART.md                 # Démarrage rapide (script de modélisation)
```

---

## 2. Installer les dépendances

Les versions sont épinglées dans `requirements.txt` (root) et `backend/requirements.txt`.  
Sur une machine locale :

```bash
python3 -m venv thermostraw-analyzer
source thermostraw-analyzer/bin/activate
pip install -r requirements.txt
```

> ℹ️ Railway installe également `requirements.txt` à la racine. Si vous ajoutez une dépendance backend, pensez à la dupliquer dans `backend/requirements.txt`.

---

## 3. Lancer le backend en local

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Points d’attention :
- Les logs doivent afficher `✅ Modèle optimisé chargé avec succès`.  
- Le modèle `backend/models/modele_GP_conductivite_22lots.pkl` est déjà converti pour fonctionner sur des environnements NumPy anciens (cas Railway).
- Pour tester rapidement :

```bash
curl http://localhost:8000/
curl http://localhost:8000/current-threshold
```

---

## 4. Recalculer / mettre à jour le modèle ML

1. **Exécuter l’entraînement complet** (`Scriptmodelisation.py`).  
   Voir `QUICKSTART.md` pour les commandes détaillées.
2. **Re-sérialiser le modèle pour Railway** :

   ```bash
   python create_compatible_model.py
   ```

   Cela produit un `backend/models/modele_GP_conductivite_22lots.pkl` sans référence au générateur `MT19937`, évitant les erreurs NumPy < 1.17.

3. **Vérifier le chargement** :

   ```bash
   python -c "from backend.models.optimized_model import OptimizedThermalConductivityPredictor; OptimizedThermalConductivityPredictor()"
   ```

4. **Commit & push** les changements (voir §6).

> 💡 `convert_model.py` permet aussi de re-sauvegarder un pickle existant avec votre version locale de NumPy sans relancer tout l’entraînement.

---

## 5. Exploiter le modèle dans un script

```python
import joblib
import numpy as np

model_data = joblib.load("backend/models/modele_GP_conductivite_22lots.pkl")
GP_model = model_data["GP"]

# Exemple de features : [R1p_log, taux_250um, EE_best_opt]
X = np.array([[1.23, 4.8, 0.57]])
lambda_pred = GP_model.predict(X)[0]
print(f"Conductivité prédite : {lambda_pred:.6f} W/m·K")
```

Variables dérivées :
- `R1p_log` : logarithme de l’indice fines/intermédiaires ;
- `taux_250um` : fraction granulométrique à 250 µm ;
- `EE_best_opt` : connectivité effective optimisée.

Métriques finales attendues :
- RMSE ≈ 0.00075 W/m·K ;
- MAE ≈ 0.00048 W/m·K ;
- R² > 0.95.

---

## 6. Déployer sur Railway

1. **Préparer les commits** :

   ```bash
   git status
   git add ...
   git commit -m "..."
   git push origin main
   ```

2. Railway déclenche automatiquement un build (service `thermostraw-api`).  
   Vérifiez les logs : `✅ Modèle optimisé chargé avec succès`.

3. Pour un rebuild propre, ajoutez si nécessaire ces variables dans le service :
   - `RAILWAY_INSTALL_COMMAND = python -m pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt`
   - `PYTHON_VERSION = 3.11.9`

   Puis relancez un déploiement en vidant le cache (`Clear build cache`).

👉 Consultez `DEPLOYMENT.md` et `DEPLOY_NOW.md` pour la procédure détaillée (frontend + backend, rollback, vérifications).

---

## 7. Ressources complémentaires

- `QUICKSTART.md` : exécution rapide du script d’entraînement.
- `DEPLOYMENT.md` : guide complet Railway (variables, clear cache, tests).
- `DEPLOY_NOW.md` : aide-mémoire pour la mise en production immédiate.
- `ROLLBACK.md` : revenir sur une version stable en cas de souci.
- `FEATURE_MODEL_UPLOAD.md` : notes sur l’upload futur de nouveaux modèles.

---

## 8. Remerciements

Projet récupéré depuis Google Colab et adapté pour VSCode / Railway (2025).  
Merci à tous les contributeurs ThermoStraw !
