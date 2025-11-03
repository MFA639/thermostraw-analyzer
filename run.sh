#!/bin/bash

# Script de lancement du projet thermostraw-analyzer
# Active l'environnement virtuel et lance le script de modélisation

echo "🚀 Démarrage du projet thermostraw-analyzer"
echo "=========================================="

# Vérifier que l'environnement virtuel existe
if [ ! -d "thermostraw-analyzer" ]; then
    echo "❌ Environnement virtuel non trouvé !"
    echo "➡️  Création de l'environnement virtuel..."
    python3 -m venv thermostraw-analyzer
    echo "✅ Environnement créé"
fi

# Activer l'environnement virtuel
echo "📦 Activation de l'environnement virtuel..."
source thermostraw-analyzer/bin/activate

# Vérifier les dépendances
echo "🔍 Vérification des dépendances..."
if ! python -c "import pandas, numpy, sklearn, matplotlib, joblib, openpyxl" 2>/dev/null; then
    echo "📥 Installation des dépendances..."
    pip install -r requirements.txt
fi

echo ""
echo "✅ Environnement prêt !"
echo ""
echo "🔬 Lancement du script de modélisation..."
echo "⚠️  Attention : la calibration peut prendre plusieurs minutes (15000 essais)"
echo ""

# Lancer le script
python Scriptmodelisation.py

echo ""
echo "=========================================="
echo "✅ Script terminé !"
echo ""
