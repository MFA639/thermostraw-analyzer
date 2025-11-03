# Guide de référence pour Agent AI
# ThermoStraw Analyzer Project

**Date de mise à jour :** 2025-11-03
**Version du modèle :** GP22 optimisé v2.0
**Auteur de la documentation :** Claude (Anthropic)

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Objectif et contexte métier](#2-objectif-et-contexte-métier)
3. [Architecture technique](#3-architecture-technique)
4. [Dépendances et environnement](#4-dépendances-et-environnement)
5. [Structure des fichiers](#5-structure-des-fichiers)
6. [Modèle de Machine Learning](#6-modèle-de-machine-learning)
7. [API Backend](#7-api-backend)
8. [Frontend React](#8-frontend-react)
9. [Flux de données](#9-flux-de-données)
10. [Déploiement](#10-déploiement)
11. [Problèmes connus et solutions](#11-problèmes-connus-et-solutions)
12. [Maintenance et évolution](#12-maintenance-et-évolution)
13. [Ressources et documentation](#13-ressources-et-documentation)

---

## 1. VUE D'ENSEMBLE DU PROJET

### 1.1 Description
**ThermoStraw Analyzer** est une application web de prédiction de la conductivité thermique de paille hachée pour l'isolation écologique. L'application utilise un modèle de Machine Learning (Gaussian Process Regression) entraîné sur des données expérimentales pour prédire la conductivité thermique λ (lambda) en fonction de la distribution granulométrique.

### 1.2 Stack technologique
- **Backend :** FastAPI (Python 3.12)
- **Frontend :** React 19.1 avec Tailwind CSS 4.1
- **ML :** scikit-learn 1.3.2, NumPy, pandas
- **Déploiement :** Railway (https://derive-labda-production.up.railway.app/)
- **Versioning :** Git + GitHub

### 1.3 URLs importantes
- **Production :** https://derive-labda-production.up.railway.app/
- **API locale :** http://localhost:8001
- **Frontend local :** http://localhost:3001
- **Repository GitHub :** [À compléter par l'utilisateur]

---

## 2. OBJECTIF ET CONTEXTE MÉTIER

### 2.1 Problème résolu
L'application permet de :
1. **Prédire en temps réel** la conductivité thermique de paille hachée sans test laboratoire coûteux
2. **Valider la qualité** de lots de production en comparant λ prédite à un seuil configurable
3. **Optimiser le processus de hachage** en ajustant la distribution granulométrique

### 2.2 Données d'entrée
L'utilisateur fournit 5 fractions granulométriques (en pourcentage, total ≈ 100%) :
- `taux_2mm` : Particules > 2 mm (plage optimale : 12-18%)
- `taux_1mm` : Particules 1-2 mm (plage optimale : 53-58%)
- `taux_500um` : Particules 500 μm - 1 mm (plage optimale : 19-24%)
- `taux_250um` : Particules 250-500 μm (plage optimale : 4-7%)
- `taux_0` : Particules < 250 μm / poussière (plage optimale : 0-1%)

### 2.3 Sortie
- **λ prédite** : Conductivité thermique en W/m·K (valeur cible ≤ 0.045)
- **Intervalle de confiance** : Incertitude à 90% (±)
- **Statut** : Conforme (vert), Attention (orange), Critique (rouge)
- **Graphique** : Distribution granulométrique avec zones optimales

### 2.4 Logique métier des seuils
```
Status = GREEN  : λ ≤ 0.040 W/m·K + distribution dans plages optimales
Status = ORANGE : 0.040 < λ ≤ 0.043 W/m·K OU distribution hors plages
Status = RED    : λ > 0.043 W/m·K → Test laboratoire requis
```

**Note :** Le seuil est configurable via l'API avec un PIN administrateur (voir section 7.5).

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Architecture globale
```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND (React + Tailwind)                    │
│  - Formulaire granulométrique                                │
│  - Graphique Recharts                                        │
│  - Résultats de prédiction                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Axios POST /predict-image
                       │ + /save-chart-image
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                           │
│  - Endpoint /predict-image                                   │
│  - Endpoint /save-chart-image                                │
│  - Gestion du seuil dynamique                                │
│  - Historique des mesures                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Appel predict()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         MODÈLE ML (Gaussian Process Regressor)               │
│  Fichier : backend/models/modele_GP_conductivite_22lots.pkl │
│  - Chargé par optimized_model.py                             │
│  - Paramètres calibrés (k500, k250, c, dmax, alpha)         │
│  - 22 échantillons, RMSE 0.000751 W/m·K                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Séparation des responsabilités

| Composant | Responsabilité | Fichiers clés |
|-----------|---------------|---------------|
| **Frontend** | Interface utilisateur, validation input, graphiques | `frontend/src/App.js`, `FractionInputForm.js`, `PredictionResult.js` |
| **API** | Routage HTTP, CORS, gestion seuil, historique | `backend/api/main.py` |
| **Modèle** | Prédiction ML, calcul variables dérivées | `backend/models/optimized_model.py` |
| **Données** | Dataset d'entraînement | `dataset/datasetConductivite.xlsx` |

---

## 4. DÉPENDANCES ET ENVIRONNEMENT

### 4.1 Backend Python

**Fichier :** `backend/requirements.txt`

```txt
setuptools==69.0.3
wheel==0.42.0
fastapi==0.115.12
uvicorn==0.34.2
pydantic==2.11.4
numpy==1.26.2
pandas==2.1.4
scikit-learn==1.3.2
scipy==1.11.4
joblib==1.4.2
matplotlib>=3.8
python-dateutil==2.9.0.post0
```

**⚠️ VERSION CRITIQUE :** scikit-learn doit être **1.3.2** (ou compatible avec le modèle .pkl). Une version différente causerait des prédictions incorrectes ou des erreurs de chargement.

**Environnement virtuel :**
- Chemin : `thermostraw-analyzer/bin/activate` (Python 3.12)
- Activation : `source thermostraw-analyzer/bin/activate`
- Commande de démarrage : `cd backend && uvicorn api.main:app --reload --port 8001`

### 4.2 Frontend Node.js

**Fichier :** `frontend/package.json`

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-scripts": "5.0.1",
    "axios": "^1.9.0",
    "recharts": "^2.15.3",
    "tailwindcss": "^4.1.5",
    "html2canvas": "^1.4.1",
    "lucide-react": "^0.503.0"
  }
}
```

**Commandes :**
```bash
# Installation
cd frontend && npm install

# Développement (port 3000 par défaut)
npm start

# Développement sur port personnalisé
PORT=3001 npm start

# Build de production
npm run build
```

### 4.3 Fichiers Git critiques

**`.gitattributes`** (CRITIQUE pour le déploiement Railway) :
```
# Fichiers binaires - Ne pas modifier
*.pkl binary
*.joblib binary
*.npy binary
*.npz binary
```

**Problème résolu :** Git modifiait le fichier `.pkl` en mode texte, insérant des caractères (`\x09`), causant l'erreur `_pickle.UnpicklingError` sur Railway. `.gitattributes` force le traitement binaire.

---

## 5. STRUCTURE DES FICHIERS

### 5.1 Arborescence complète
```
thermostraw-analyzer/
├── backend/
│   ├── api/
│   │   └── main.py              # API FastAPI (endpoints)
│   ├── models/
│   │   ├── modele_GP_conductivite_22lots.pkl  # ⭐ MODÈLE ML (11 Ko)
│   │   ├── optimized_model.py   # Classe de prédiction
│   │   ├── gaussian_process.py  # Ancien modèle (archive)
│   │   └── ee_best.py           # Calculs physiques
│   ├── requirements.txt         # Dépendances Python
│   └── run.py                   # Script de démarrage
├── frontend/
│   ├── src/
│   │   ├── App.js               # Composant principal
│   │   ├── components/
│   │   │   ├── FractionInputForm.js  # Formulaire granulométrique
│   │   │   └── PredictionResult.js   # Affichage résultats
│   │   └── index.js
│   ├── public/
│   ├── build/                   # Build de production (généré)
│   └── package.json
├── dataset/
│   └── datasetConductivite.xlsx # 22 échantillons d'entraînement
├── Scriptmodelisation.py        # ⭐ SCRIPT DE RÉENTRAÎNEMENT
├── .gitattributes               # Configuration Git pour fichiers binaires
├── AI_AGENT_GUIDE.md            # ⭐ CE FICHIER
├── README.md                    # Documentation utilisateur
├── DEPLOYMENT.md                # Guide de déploiement
└── thermostraw-analyzer/        # Environnement virtuel Python
    └── bin/activate
```

### 5.2 Fichiers critiques à ne JAMAIS supprimer

| Fichier | Importance | Raison |
|---------|------------|--------|
| `backend/models/modele_GP_conductivite_22lots.pkl` | ⭐⭐⭐ | Le modèle ML entraîné (22 échantillons, 15000 essais) |
| `.gitattributes` | ⭐⭐⭐ | Empêche la corruption du .pkl par Git |
| `Scriptmodelisation.py` | ⭐⭐ | Seul moyen de régénérer le modèle |
| `dataset/datasetConductivite.xlsx` | ⭐⭐ | Données d'entraînement (22 lots) |
| `backend/models/optimized_model.py` | ⭐⭐ | Classe de chargement et prédiction |

---

## 6. MODÈLE DE MACHINE LEARNING

### 6.1 Algorithme et entraînement

**Type :** Gaussian Process Regressor (scikit-learn)

**Kernel :** RBF (Radial Basis Function) + WhiteKernel (bruit)
```python
kernel = RBF(length_scale=[0.4, 0.4, 1.0]) + WhiteKernel(noise_level=0.000001)
```

**Données d'entraînement :**
- **Nombre d'échantillons :** 22 lots de paille hachée
- **Fichier :** `dataset/datasetConductivite.xlsx`
- **Variables d'entrée (features) :**
  - `R1p_log` : Indice de répartition fines/intermédiaires = -log(taux_250um / (taux_500um + taux_250um))
  - `taux_250um` : Pourcentage de particules 250-500 μm
  - `EE_best_opt` : Interconnexion effective calibrée (5 paramètres optimisés)
- **Variable cible (target) :** `lambda` (conductivité thermique en W/m·K)

**Performances (Leave-One-Out Cross-Validation) :**
- **RMSE :** 0.000751 W/m·K
- **MAE :** 0.000484 W/m·K
- **R² :** -1.9141 (petit dataset, overfitting contrôlé)

### 6.2 Paramètres optimisés

Le modèle utilise 5 paramètres calibrés par recherche aléatoire (15000 essais) pour calculer `EE_best_opt` :

```python
params = {
    'k500': 1.5104,   # Pondération particules 500µm
    'k250': 7.9803,   # Pondération particules 250µm
    'c': 0.0705,      # Coefficient de pénalité fines
    'dmax': 1.6430,   # Pénalité maximale due aux fines
    'alpha': 0.4469   # Exposant de la pénalité
}
```

**Stockage :** Ces paramètres sont inclus dans `modele_GP_conductivite_22lots.pkl` (dictionnaire `params`).

### 6.3 Régénération du modèle

**Quand régénérer :**
- Ajout de nouveaux échantillons au dataset
- Changement de version de scikit-learn
- Amélioration de l'algorithme ou des paramètres

**Procédure :**
```bash
# 1. Activer l'environnement virtuel
source thermostraw-analyzer/bin/activate

# 2. Vérifier que dataset/datasetConductivite.xlsx est à jour

# 3. Lancer le script de modélisation (durée : ~20-30 min)
python3 -u Scriptmodelisation.py 2>&1 | tee /tmp/modelisation.log

# 4. Vérifier les sorties générées :
#    - modele_GP_conductivite_22lots.pkl (modèle final)
#    - validation_finale_GP_calibre.png (graphique de performance)
#    - /tmp/modelisation.log (log complet)

# 5. Copier le nouveau modèle dans le backend
cp modele_GP_conductivite_22lots.pkl backend/models/

# 6. Tester localement avant déploiement
cd backend && uvicorn api.main:app --reload --port 8001

# 7. Commiter et pusher (le .gitattributes protégera le .pkl)
git add backend/models/modele_GP_conductivite_22lots.pkl
git commit -m "Mise à jour du modèle ML"
git push origin main
```

**⚠️ IMPORTANT :** Le script `Scriptmodelisation.py` contient des prints de progression (tous les 500 essais) pour suivre l'avancement en temps réel.

---

## 7. API BACKEND

### 7.1 Fichier principal
**Chemin :** `backend/api/main.py`

**Framework :** FastAPI avec CORS activé (allow_origins="*")

**Démarrage local :**
```bash
cd backend
source ../thermostraw-analyzer/bin/activate
uvicorn api.main:app --reload --port 8001
```

### 7.2 Endpoints principaux

#### 7.2.1 POST `/predict-image`
**Rôle :** Prédiction de conductivité thermique

**Request body :**
```json
{
  "taux_2mm": 15.83,
  "taux_1mm": 53.44,
  "taux_500um": 20.46,
  "taux_250um": 7.26,
  "taux_0": 3.01
}
```

**Response :**
```json
{
  "lambda_predicted": 0.039826,
  "confidence_interval": 0.001234,
  "status": "conforme",
  "r1p_log": 1.0234,
  "ee_best": 4.567,
  "threshold": 0.045,
  "model_info": {
    "name": "GP22 optimisé",
    "version": "v2.0-optimized",
    "date": "2025-11-03",
    "samples_count": 22,
    "rmse": 0.000751,
    "mae": 0.000484
  },
  "chart_image": "data:image/png;base64,..."
}
```

**Logique interne :**
1. Chargement du modèle via `OptimizedThermalConductivityPredictor`
2. Validation de la somme des fractions (99-101%)
3. Calcul de `R1p_log` et `EE_best_opt`
4. Prédiction avec `model.predict()`
5. Comparaison avec `CURRENT_THRESHOLD` (configurable)
6. Ajout à l'historique `measurements_history`

#### 7.2.2 POST `/save-chart-image`
**Rôle :** Stockage de l'image du graphique granulométrique (généré par frontend)

**Request body :**
```json
{
  "chart_image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Response :**
```json
{
  "message": "Image sauvegardée sous cleImage"
}
```

**Stockage :** Variable globale `chart_image_last` (en mémoire, réinitialisée au redémarrage)

#### 7.2.3 GET `/current-threshold`
**Rôle :** Récupération du seuil de conformité actuel

**Response :**
```json
{
  "threshold": 0.045
}
```

#### 7.2.4 POST `/update-threshold`
**Rôle :** Modification du seuil (protégé par PIN)

**Request body :**
```json
{
  "pin": "1234",
  "threshold": 0.043
}
```

**Response (succès) :**
```json
{
  "success": true,
  "new_threshold": 0.043,
  "message": "Seuil mis à jour à 0.043 W/m·K"
}
```

**Response (erreur PIN) :**
```json
{
  "detail": "PIN incorrect"
}
```

**⚠️ SÉCURITÉ :** Le PIN est hardcodé dans `main.py` (ligne 35) : `ADMIN_PIN = "1234"`. Changez-le avant déploiement.

### 7.3 Configuration CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7.4 Gestion des erreurs
- **400 Bad Request :** Somme des fractions ≠ 100% (tolérance 99-101%)
- **403 Forbidden :** PIN incorrect
- **500 Internal Server Error :** Erreur de chargement du modèle ou calcul

---

## 8. FRONTEND REACT

### 8.1 Composants principaux

#### 8.1.1 `App.js`
**Rôle :** Composant racine, orchestration

**Responsabilités :**
- Gestion de l'état global (`prediction`, `isLoading`)
- Appel API via Axios (`/save-chart-image`, `/predict-image`)
- Affichage conditionnel des composants

**Flux :**
```javascript
handleSubmit(data)
  ↓
1. Génération du graphique avec Recharts
  ↓
2. Conversion en image avec html2canvas
  ↓
3. POST /save-chart-image
  ↓
4. POST /predict-image avec fractions
  ↓
5. Mise à jour de l'état prediction
  ↓
6. Affichage de PredictionResult
```

#### 8.1.2 `FractionInputForm.js`
**Rôle :** Formulaire de saisie granulométrique

**Champs :**
- `batchNumber` : Numéro de lot (obligatoire)
- `taux_2mm`, `taux_1mm`, `taux_500um`, `taux_250um`, `taux_0` : Pourcentages

**Validation :**
```javascript
validateInput() {
  // 1. Vérifier que toutes les valeurs sont numériques
  // 2. Vérifier que la somme est entre 99% et 101%
  // 3. Vérifier que batchNumber n'est pas vide
}
```

**⚠️ TYPE D'INPUT :** Les inputs sont de type `text` (et non `number`) avec `inputMode="decimal"` pour éviter les problèmes de saisie décimale sur mobile.

**Valeurs par défaut (optimales) :**
```javascript
{
  taux_2mm: '15.83',
  taux_1mm: '53.44',
  taux_500um: '20.46',
  taux_250um: '7.26',
  taux_0: '3.01'
}
```

#### 8.1.3 `PredictionResult.js`
**Rôle :** Affichage des résultats de prédiction

**Sections :**
1. **Badge de statut** : Conforme (vert), Attention (orange), Critique (rouge)
2. **Conductivité prédite** : λ avec intervalle de confiance
3. **Barre de progression** : Position par rapport aux seuils
4. **Messages spécifiques** : Recommandations selon le statut

**Logique de couleur :**
```javascript
const statusColors = {
  green: 'bg-green-500',   // λ ≤ 0.040
  orange: 'bg-orange-400', // 0.040 < λ ≤ 0.043
  red: 'bg-red-500'        // λ > 0.043
};
```

### 8.2 Gestion des appels API

**Configuration Axios :**
```javascript
// URL de base (à ajuster selon l'environnement)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

axios.post(`${API_BASE_URL}/predict-image`, fractions)
  .then(response => setPrediction(response.data))
  .catch(error => console.error(error));
```

**⚠️ VARIABLE D'ENVIRONNEMENT :** Créer un fichier `.env` dans `frontend/` :
```
REACT_APP_API_URL=https://derive-labda-production.up.railway.app
```

### 8.3 Graphiques Recharts

**Librairie :** recharts ^2.15.3

**Type de graphique :** BarChart avec zones de référence (ReferenceArea)

**Zones optimales affichées :**
```javascript
const optimalRanges = {
  taux_2mm: [12, 18],
  taux_1mm: [53, 58],
  taux_500um: [19, 24],
  taux_250um: [4, 7],
  taux_0: [0, 1]
};
```

**Export en image :** Conversion avec `html2canvas` avant envoi au backend.

---

## 9. FLUX DE DONNÉES

### 9.1 Flux complet de prédiction

```
┌──────────────────────────────────────────────────────────────┐
│ 1. UTILISATEUR SAISIT LES FRACTIONS GRANULOMÉTRIQUES         │
│    (taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0)      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. FRONTEND : Validation (somme ≈ 100%)                      │
│    + Génération du graphique Recharts                        │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. FRONTEND : Conversion graphique en base64 (html2canvas)   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. POST /save-chart-image                                     │
│    Body: { chart_image: "data:image/png;base64,..." }        │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. BACKEND : Stockage image en mémoire (chart_image_last)    │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. POST /predict-image                                        │
│    Body: { taux_2mm, taux_1mm, taux_500um, taux_250um, ... } │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. BACKEND : predictor.predict(**fractions)                  │
│    ├── Chargement du modèle .pkl (si pas déjà en cache)      │
│    ├── Calcul R1p_log = -log(taux_250um / (taux_500um+...))  │
│    ├── Calcul EE_best_opt avec paramètres optimisés          │
│    ├── Prédiction ML : model.predict([[R1p_log, t250, EE]])  │
│    └── Calcul intervalle de confiance (90%)                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. BACKEND : Détermination du statut                         │
│    if lambda_pred <= CURRENT_THRESHOLD:                       │
│        status = "conforme"                                    │
│    else:                                                      │
│        status = "non_conforme"                                │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. BACKEND : Ajout à l'historique + Retour de la réponse     │
│    Response: { lambda_predicted, confidence_interval,         │
│                status, chart_image, model_info, ... }         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 10. FRONTEND : Affichage PredictionResult                    │
│     - Badge de statut (vert/orange/rouge)                    │
│     - Conductivité prédite avec IC                           │
│     - Barre de progression                                   │
│     - Graphique granulométrique                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Variables dérivées calculées

**R1p_log :** Indice de répartition fines/intermédiaires
```python
R1p = taux_250um / (taux_500um + taux_250um + 1e-10)
R1p_log = -np.log(R1p + 1e-10)
```

**EE_best_opt :** Interconnexion effective calibrée
```python
# 1. Calcul du nombre effectif de particules par fraction
n[f] = taux[f] / (SIZE[f]**2 * ASPECT[f])

# 2. Application des pondérations optimisées
n['taux_500um'] /= k500  # k500 = 1.5104
n['taux_250um'] /= k250  # k250 = 7.9803

# 3. Normalisation
n = {f: v/sum(n.values()) for f, v in n.items()}

# 4. Calcul de la connectivité
conn = sum(n[f] * (ASPECT[f] - 1) for f in n)

# 5. Pénalité due aux fines
dust = min(taux_0 + c * taux_250um, dmax) / 100
penalty = np.exp(-3 * dust)**alpha

# 6. Résultat final
EE_best_opt = conn * penalty
```

---

## 10. DÉPLOIEMENT

### 10.1 Déploiement Railway

**Plateforme :** Railway (https://railway.app/)

**Configuration automatique :**
- **Détection :** Railway détecte automatiquement un projet FastAPI
- **Build :** Installation des dépendances depuis `backend/requirements.txt`
- **Démarrage :** Commande par défaut ou via `Procfile`

**Variables d'environnement (si nécessaires) :**
```
PORT=8000  # Railway assigne automatiquement un port
PYTHON_VERSION=3.12
```

**Fichier Procfile (optionnel) :**
```
web: cd backend && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

**URL de production :**
https://derive-labda-production.up.railway.app/

### 10.2 Workflow de déploiement

**Déploiement automatique depuis GitHub :**
```bash
# 1. Faire les modifications locales
git add .
git commit -m "Description des changements"

# 2. Pusher sur GitHub
git push origin main

# 3. Railway détecte le push et redéploie automatiquement
# Vérifier les logs Railway pour confirmer le déploiement
```

**Vérification du déploiement :**
```bash
# Tester l'endpoint racine
curl https://derive-labda-production.up.railway.app/

# Tester une prédiction
curl -X POST https://derive-labda-production.up.railway.app/predict-image \
  -H "Content-Type: application/json" \
  -d '{
    "taux_2mm": 15.83,
    "taux_1mm": 53.44,
    "taux_500um": 20.46,
    "taux_250um": 7.26,
    "taux_0": 3.01
  }'
```

### 10.3 Frontend déployé

**Option 1 : Frontend servi par Railway (statique)**
- Build du frontend : `cd frontend && npm run build`
- Copier `build/` dans le backend
- Servir via FastAPI avec `StaticFiles`

**Option 2 : Frontend sur Vercel/Netlify (recommandé)**
- Déployer `frontend/` séparément
- Configurer `REACT_APP_API_URL` vers Railway

**Configuration actuelle :** [À vérifier avec l'utilisateur]

---

## 11. PROBLÈMES CONNUS ET SOLUTIONS

### 11.1 Erreur pickle sur Railway

**Symptôme :**
```
_pickle.UnpicklingError: invalid load key, '\x09'.
```

**Cause :** Git modifie le fichier `.pkl` en mode texte, insérant des caractères (tabulations).

**Solution :**
1. Créer un fichier `.gitattributes` à la racine :
```
*.pkl binary
*.joblib binary
*.npy binary
*.npz binary
```

2. Re-commiter le fichier `.pkl` :
```bash
git rm --cached backend/models/modele_GP_conductivite_22lots.pkl
git add backend/models/modele_GP_conductivite_22lots.pkl
git commit -m "Fix: Fichier .pkl en mode binaire"
git push origin main
```

### 11.2 Prédictions constantes (λ = 0.039959)

**Symptôme :** Le modèle retourne toujours la même valeur quelle que soit l'entrée.

**Cause :** Incompatibilité de version scikit-learn (modèle entraîné avec 1.3.2, runtime avec 1.7.1).

**Solution :** Régénérer le modèle avec la version de scikit-learn du runtime :
```bash
source thermostraw-analyzer/bin/activate
python3 -u Scriptmodelisation.py 2>&1 | tee /tmp/modelisation.log
cp modele_GP_conductivite_22lots.pkl backend/models/
git add backend/models/modele_GP_conductivite_22lots.pkl
git commit -m "Mise à jour modèle pour sklearn 1.7.1"
git push origin main
```

### 11.3 Script de modélisation bloqué

**Symptôme :** `Scriptmodelisation.py` ne produit aucune sortie pendant 30 minutes.

**Cause :**
1. Buffer Python non vidé (`-u` manquant)
2. `plt.show()` bloque l'exécution
3. Progression affichée trop rarement

**Solution (déjà appliquée) :**
```bash
# Lancer avec -u pour unbuffered output
python3 -u Scriptmodelisation.py 2>&1 | tee /tmp/modelisation.log

# Modifications dans le script :
# - plt.ioff() au début
# - plt.close() au lieu de plt.show()
# - Progression tous les 500 essais avec timestamps
```

### 11.4 Erreur CORS sur l'API

**Symptôme :**
```
Access to fetch at 'http://localhost:8001/predict-image' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Solution :** CORS est déjà configuré dans `backend/api/main.py` (ligne 26-32). Si le problème persiste, vérifier que :
1. Le backend est bien démarré sur le port 8001
2. Le frontend utilise la bonne URL d'API

### 11.5 Port 8001 déjà utilisé

**Symptôme :**
```
ERROR:    [Errno 98] Address already in use
```

**Solution :**
```bash
# Trouver le processus utilisant le port 8001
lsof -i :8001

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
uvicorn api.main:app --reload --port 8002
```

---

## 12. MAINTENANCE ET ÉVOLUTION

### 12.1 Ajout de nouveaux échantillons

**Procédure :**
1. Ouvrir `dataset/datasetConductivite.xlsx`
2. Ajouter une nouvelle ligne avec :
   - `taux_2mm`, `taux_1mm`, `taux_500um`, `taux_250um`, `taux_0` (en %)
   - `lambda` (mesure laboratoire en W/m·K)
3. Sauvegarder le fichier
4. Régénérer le modèle (voir section 6.3)
5. Commiter et pusher

### 12.2 Modification des plages optimales

**Fichiers à modifier :**
1. **Frontend :** `frontend/src/components/PredictionResult.js`
```javascript
const optimal_ranges = {
  taux_2mm: [12, 18],   // ← Modifier ici
  taux_1mm: [53, 58],
  // ...
};
```

2. **Backend :** `backend/api/main.py` (ligne 144-150)
```python
"optimal_ranges": {
    "taux_2mm": [12, 18],  # ← Modifier ici
    "taux_1mm": [53, 58],
    # ...
}
```

### 12.3 Changement du seuil de conformité

**Méthode 1 : Via l'API (temporaire, réinitialisé au redémarrage)**
```bash
curl -X POST https://derive-labda-production.up.railway.app/update-threshold \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234", "threshold": 0.043}'
```

**Méthode 2 : Modification du code (permanent)**
Fichier : `backend/api/main.py` (ligne 36)
```python
CURRENT_THRESHOLD = 0.045  # ← Modifier ici
```

### 12.4 Ajout de nouveaux endpoints API

**Template :**
```python
@app.post("/nom-endpoint")
def nom_fonction(request: ModelePydantic):
    try:
        # Logique métier
        result = predictor.some_method(**request.dict())
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(500, f"Erreur: {e}")
```

**Tests :**
```bash
# Test local
curl -X POST http://localhost:8001/nom-endpoint \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'

# Test production
curl -X POST https://derive-labda-production.up.railway.app/nom-endpoint \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'
```

---

## 13. RESSOURCES ET DOCUMENTATION

### 13.1 Documentation interne

| Fichier | Contenu |
|---------|---------|
| `AI_AGENT_GUIDE.md` | ⭐ **CE FICHIER** - Guide complet pour agents AI |
| `README.md` | Documentation utilisateur générale |
| `DEPLOYMENT.md` | Guide de déploiement détaillé |
| `QUICKSTART.md` | Guide de démarrage rapide |
| `FEATURE_MODEL_UPLOAD.md` | Documentation d'une fonctionnalité (à vérifier) |
| `/tmp/modelisation.log` | Log complet du dernier entraînement |

### 13.2 Logs importants

**Backend local :**
```bash
cd backend
source ../thermostraw-analyzer/bin/activate
uvicorn api.main:app --reload --port 8001 2>&1 | tee /tmp/backend.log
```

**Logs Railway :**
1. Aller sur https://railway.app/
2. Sélectionner le projet ThermoStraw
3. Onglet "Deployments" → Cliquer sur le déploiement actif → "View Logs"

**Logs de modélisation :**
```bash
cat /tmp/modelisation.log
# Contient : progression, paramètres optimisés, performances (RMSE, MAE, R²)
```

### 13.3 Commandes de débogage

**Tester le chargement du modèle :**
```bash
source thermostraw-analyzer/bin/activate
python3 -c "
from backend.models.optimized_model import OptimizedThermalConductivityPredictor
p = OptimizedThermalConductivityPredictor()
result = p.predict(15.83, 53.44, 20.46, 7.26, 3.01)
print('Lambda:', result['lambda_predicted'])
"
```

**Vérifier la version de scikit-learn :**
```bash
source thermostraw-analyzer/bin/activate
python3 -c "import sklearn; print(sklearn.__version__)"
```

**Inspecter le fichier .pkl :**
```bash
# Vérifier qu'il est bien binaire
file backend/models/modele_GP_conductivite_22lots.pkl
# Résultat attendu : "data" (pas "ASCII text")

# Afficher les premiers octets
hexdump -C backend/models/modele_GP_conductivite_22lots.pkl | head -10
# Doit commencer par 80 04 95 (pickle protocol 4)
```

### 13.4 Contacts et support

**Développeur principal :** [À compléter par l'utilisateur]

**Repository GitHub :** [À compléter par l'utilisateur]

**Support technique :**
- Logs Railway : [Lien dashboard]
- Documentation FastAPI : https://fastapi.tiangolo.com/
- Documentation scikit-learn : https://scikit-learn.org/stable/

---

## 14. CHECKLIST POUR AGENT AI

### 14.1 Avant de commencer une tâche

- [ ] Lire la section correspondante de ce guide
- [ ] Vérifier les logs récents (`/tmp/backend.log`, Railway logs)
- [ ] Identifier les fichiers à modifier (section 5)
- [ ] Vérifier les dépendances (section 4)

### 14.2 Après modification du code

- [ ] Tester localement (backend port 8001, frontend port 3001)
- [ ] Vérifier qu'aucune erreur dans les logs
- [ ] Tester au moins 3 cas différents de prédiction
- [ ] Commiter avec un message descriptif
- [ ] Pusher et vérifier le déploiement Railway

### 14.3 En cas de problème

1. **Consulter la section 11** (Problèmes connus)
2. **Lire les logs** :
   - Local : `/tmp/backend.log`, `/tmp/modelisation.log`
   - Production : Railway dashboard
3. **Vérifier les versions** :
   - scikit-learn : 1.3.2
   - Python : 3.12
   - React : 19.1.0
4. **Tester le modèle isolément** (section 13.3)

---

## 15. GLOSSAIRE

| Terme | Définition |
|-------|------------|
| **λ (lambda)** | Conductivité thermique (W/m·K). Plus elle est basse, meilleure est l'isolation. |
| **GP** | Gaussian Process (Processus Gaussien) - Algorithme de ML utilisé |
| **RMSE** | Root Mean Square Error - Erreur quadratique moyenne |
| **MAE** | Mean Absolute Error - Erreur absolue moyenne |
| **LOOCV** | Leave-One-Out Cross-Validation - Méthode de validation pour petits datasets |
| **R1p_log** | Variable dérivée : -log(taux_250um / (taux_500um + taux_250um)) |
| **EE_best_opt** | Interconnexion effective optimisée - Variable dérivée complexe (5 paramètres) |
| **Fractions granulométriques** | Distribution des tailles de particules (2mm, 1mm, 500µm, 250µm, <250µm) |
| **Seuil de conformité** | Valeur maximale de λ pour considérer le lot conforme (par défaut 0.045 W/m·K) |

---

**FIN DU GUIDE**

**Version :** 1.0
**Date :** 2025-11-03
**Auteur :** Claude (Anthropic)
**Contact :** [À compléter par l'utilisateur]

---

**Note pour agents AI :** Ce guide est exhaustif mais n'est pas figé. Si vous rencontrez de nouveaux problèmes ou ajoutez des fonctionnalités, mettez à jour ce fichier pour les agents futurs.
