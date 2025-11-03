#!/bin/bash

# Script de déploiement sécurisé - ThermoStraw v2.0
# Créé automatiquement par Claude Code

echo "🚀 Déploiement ThermoStraw v2.0 - Modèle Optimisé"
echo "================================================"
echo ""

# Vérification des changements
echo "📋 Changements à déployer:"
git status --short
echo ""

# Confirmation
read -p "Continuer le déploiement? (oui/non): " confirm
if [ "$confirm" != "oui" ]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

echo ""
echo "🏷️  ÉTAPE 1/3: Push des tags de sécurité..."
echo "   - v1.0-stable (version actuellement en prod)"
echo "   - v2.0-optimized (nouvelle version)"
git push origin v1.0-stable v2.0-optimized

if [ $? -ne 0 ]; then
    echo "⚠️  Erreur lors du push des tags (probablement déjà existants)"
    echo "   Continuons quand même..."
fi

echo ""
echo "📤 ÉTAPE 2/3: Push de la nouvelle version..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ ERREUR: Le push a échoué!"
    echo ""
    echo "Vérifiez:"
    echo "  1. Vos credentials GitHub"
    echo "  2. Votre connexion internet"
    echo "  3. Les permissions sur le repo"
    exit 1
fi

echo ""
echo "✅ ÉTAPE 3/3: Code déployé sur GitHub!"
echo ""
echo "🔍 Surveillance du déploiement Railway:"
echo "   1. Ouvrez https://railway.app/dashboard"
echo "   2. Sélectionnez 'thermostraw-api'"
echo "   3. Onglet 'Logs'"
echo "   4. Cherchez: '✅ Modèle optimisé chargé avec succès'"
echo ""
echo "⏱️  Temps de déploiement Railway: ~3-5 minutes"
echo ""
echo "🚨 En cas de problème:"
echo "   Option 1 (Recommandé):"
echo "     - Railway Dashboard > Deployments"
echo "     - Cliquez sur le déploiement précédent"
echo "     - Bouton 'Redeploy'"
echo ""
echo "   Option 2 (Rollback Git):"
echo "     git reset --hard v1.0-stable"
echo "     git push origin main --force"
echo ""
echo "📚 Documentation complète: voir ROLLBACK.md"
echo ""
echo "✅ Déploiement terminé! Railway va maintenant builder et déployer."
