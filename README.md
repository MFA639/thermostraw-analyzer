# Thermostraw Analyzer

Projet de modélisation de la conductivité thermique des matériaux biosourcés (paille, isolants naturels) basé sur leur distribution granulométrique.

## Description

Ce projet utilise un modèle de **Gaussian Process Regressor** pour prédire la conductivité thermique d'un matériau en fonction de :
- La répartition granulométrique (taille des particules)
- Des variables dérivées (R1p_log, EE_best)
- Une optimisation par recherche aléatoire (15 000 combinaisons)

## Installation

### 1. Activer l'environnement virtuel

```bash
source thermostraw-analyzer/bin/activate
```

### 2. Installer les dépendances (déjà fait)

```bash
pip install -r requirements.txt
```

## Structure du projet

```
thermostraw-analyzer/
├── dataset/
│   └── datasetConductivite.xlsx    # Données d'entrée (22 lots)
├── Scriptmodelisation.py           # Script principal
├── requirements.txt                # Dépendances Python
├── thermostraw-analyzer/           # Environnement virtuel
└── README.md                       # Ce fichier
```

## Utilisation

### Lancer le script complet

```bash
# Activer l'environnement
source thermostraw-analyzer/bin/activate

# Lancer le script
python Scriptmodelisation.py
```

Le script va :
1. Charger et nettoyer les données
2. Calculer les variables dérivées
3. Effectuer une première validation
4. Calibrer le modèle (⚠️ prend plusieurs minutes)
5. Valider le modèle final
6. Exporter les fichiers résultats

### Fichiers générés

Après exécution, les fichiers suivants seront créés :

**Modèles :**
- `modele_GP_best.pkl` - Modèle intermédiaire
- `modele_GP_conductivite_22lots.pkl` - Modèle final optimisé

**Graphiques :**
- `validation_initiale_GP.png` - Validation avec paramètres initiaux
- `calibration_random_search.png` - Résultats de la recherche aléatoire
- `validation_finale_GP_calibre.png` - Validation finale du modèle optimisé

## Utiliser le modèle entraîné

```python
import joblib
import numpy as np

# Charger le modèle
model_data = joblib.load('modele_GP_conductivite_22lots.pkl')
GP_model = model_data['GP']
params = model_data['params']

# Préparer vos données
# Format : [R1p_log, taux_250um, EE_best_opt]
X_nouvelles = np.array([[...]])  # Vos données

# Prédire la conductivité thermique
prediction = GP_model.predict(X_nouvelles)
print(f"Conductivité prédite : {prediction[0]:.6f} W/m·K")
```

## Dépendances

- Python >= 3.10
- pandas >= 2.0.0
- numpy >= 1.24.0
- scikit-learn >= 1.3.0
- matplotlib >= 3.7.0
- openpyxl >= 3.1.0
- joblib >= 1.3.0

## Métriques de performance attendues

Après calibration, le modèle devrait atteindre :
- **R² > 0.95** (coefficient de détermination)
- **RMSE < 0.002 W/m·K** (erreur quadratique moyenne)
- **MAE < 0.001 W/m·K** (erreur absolue moyenne)

## Notes techniques

### Variables d'entrée du modèle

- **R1p_log** : Logarithme de l'indice de répartition fines/intermédiaires
- **taux_250um** : Pourcentage de particules de 250µm
- **EE_best_opt** : Interconnexion effective optimisée

### Paramètres calibrés (EE_general)

- **k500** : Coefficient pour fraction 500µm (plage: 1.5-4.0)
- **k250** : Coefficient pour fraction 250µm (plage: 3.0-8.0)
- **c** : Coefficient d'influence des fines (plage: 0.05-0.2)
- **dmax** : Seuil maximal de poussière (plage: 1.0-2.0)
- **alpha** : Exposant de pénalité (plage: 0.3-0.6)

## Auteur

Script récupéré et adapté de Google Colab pour VSCode (2025)
