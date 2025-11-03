# 🔄 Plan de Rollback - ThermoStraw Analyzer

## 📌 Versions taggées

- **v1.0-stable** (commit: 915c8df) - Version actuellement en production
- **v2.0-optimized** (commit: 1f7048e) - Nouvelle version avec modèle optimisé

## 🚨 En cas de problème après déploiement

### Option 1: Rollback via Railway Dashboard (RECOMMANDÉ)

1. Allez sur https://railway.app/dashboard
2. Sélectionnez votre projet `thermostraw-api`
3. Onglet **Deployments**
4. Trouvez le déploiement précédent (avant la mise à jour)
5. Cliquez sur "Redeploy" sur ce déploiement

✅ **Temps de rollback: ~2-3 minutes**

### Option 2: Rollback via Git

Si Railway ne répond pas ou pour forcer un retour à v1.0:

```bash
# 1. Revenir à la version stable
git reset --hard v1.0-stable

# 2. Forcer le push (⚠️ attention!)
git push origin main --force

# 3. Railway redéploiera automatiquement
```

⚠️ **Attention:** `--force` écrase l'historique. Utilisez avec prudence!

### Option 3: Rollback progressif (sans --force)

```bash
# 1. Créer un commit de revert
git revert HEAD --no-edit

# 2. Push normalement
git push origin main
```

✅ **Plus sûr:** conserve l'historique complet

## 🧪 Vérifications post-rollback

Après le rollback, testez:

```bash
# Test API
curl https://derive-labda-production.up.railway.app/
curl https://derive-labda-production.up.railway.app/current-threshold

# Test prédiction
curl -X POST https://derive-labda-production.up.railway.app/predict-image \
  -H "Content-Type: application/json" \
  -d '{
    "taux_2mm": 15.0,
    "taux_1mm": 55.0,
    "taux_500um": 20.0,
    "taux_250um": 5.0,
    "taux_0": 5.0
  }'
```

## 📊 Comparaison des versions

| Aspect | v1.0-stable | v2.0-optimized |
|--------|-------------|----------------|
| Échantillons | 12 | 22 |
| RMSE | ~0.002 W/m·K | 0.000751 W/m·K |
| Paramètres | Non calibrés | Calibrés (15000 essais) |
| Fichier modèle | Ancien GP | modele_GP_conductivite_22lots.pkl |

## 🔍 Logs Railway

Pour surveiller le déploiement:

1. Dashboard Railway > Votre service > **Logs**
2. Recherchez: "✅ Modèle optimisé chargé avec succès"
3. Si vous voyez une erreur de chargement du modèle → Rollback immédiat

## 📞 Contacts

En cas de problème critique, les fichiers importants sont:
- `backend/models/optimized_model.py` - Chargeur du modèle
- `backend/api/main.py` - Logique de fallback intégrée
