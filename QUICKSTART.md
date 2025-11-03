# Guide de démarrage rapide

## 🚀 Lancement rapide

### Méthode 1 : Utiliser le script automatique

```bash
./run.sh
```

Ce script va :
- Vérifier/créer l'environnement virtuel
- Installer les dépendances si nécessaire
- Lancer le script de modélisation

### Méthode 2 : Lancement manuel

```bash
# 1. Activer l'environnement virtuel
source thermostraw-analyzer/bin/activate

# 2. Lancer le script
python Scriptmodelisation.py

# 3. Désactiver l'environnement (quand vous avez terminé)
deactivate
```

## ⏱️ Temps d'exécution

Le script complet prend environ **5-10 minutes** :
- Section 1-2 : ~10 secondes
- Section 3 : ~30 secondes
- **Section 4 : ~5-8 minutes** (calibration de 15000 combinaisons)
- Section 5-6 : ~1 minute

## 📊 Résultats

Après exécution, vous aurez :

### Fichiers de modèles (.pkl)
- `modele_GP_best.pkl`
- `modele_GP_conductivite_22lots.pkl`

### Graphiques (.png)
- `validation_initiale_GP.png`
- `calibration_random_search.png`
- `validation_finale_GP_calibre.png`

### Export vers l'API

Après l'entraînement, régénérez le pickle consommé par l'API :

```bash
python create_compatible_model.py  # écrit dans backend/models/
```

Ensuite, vérifiez que le modèle se charge :

```bash
python -c "from backend.models.optimized_model import OptimizedThermalConductivityPredictor; OptimizedThermalConductivityPredictor()"
```

## 🔧 Commandes utiles

```bash
# Vérifier l'environnement actif
which python

# Lister les packages installés
pip list

# Réinstaller les dépendances
pip install -r requirements.txt --force-reinstall

# Nettoyer les fichiers générés
rm -f *.pkl *.png
```

## ❓ Dépannage

### Le script ne trouve pas openpyxl
```bash
source thermostraw-analyzer/bin/activate
pip install openpyxl
```

### Problème avec matplotlib
```bash
pip install matplotlib --upgrade
```

### L'environnement ne s'active pas
```bash
# Recréer l'environnement
rm -rf thermostraw-analyzer
python3 -m venv thermostraw-analyzer
source thermostraw-analyzer/bin/activate
pip install -r requirements.txt
```

## 📁 Structure des données

Le fichier `dataset/datasetConductivite.xlsx` doit contenir :
- Colonnes de fractions granulométriques (> 2mm, > 1mm, etc.)
- Colonne de conductivité thermique mesurée
- Au moins 10-20 échantillons pour un entraînement valide
