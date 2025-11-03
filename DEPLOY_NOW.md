# 🚀 Guide de Déploiement Rapide - v2.0

## ✅ Tout est prêt pour le déploiement!

### Option 1: Script automatique (RECOMMANDÉ)

```bash
./deploy.sh
```

Le script va:
1. Vous montrer les changements
2. Demander confirmation
3. Pousser les tags de sécurité (v1.0-stable, v2.0-optimized)
4. Pousser le code sur GitHub
5. Afficher les instructions de surveillance

### Option 2: Commandes manuelles

Si le script ne fonctionne pas, exécutez ces commandes:

```bash
# 1. Pousser les tags de sécurité
git push origin v1.0-stable v2.0-optimized

# 2. Pousser la nouvelle version
git push origin main
```

## 🔍 Après le push

**Railway va automatiquement détecter les changements et redéployer!**

### Surveillez le déploiement:

1. **Ouvrez:** https://railway.app/dashboard
2. **Sélectionnez:** `thermostraw-api` (ou le nom de votre service backend)
3. **Onglet:** Logs
4. **Cherchez ce message:**
   ```
   ✅ Modèle optimisé chargé avec succès
      Paramètres calibrés :
        k500   = 1.5104
        k250   = 7.9803
        c      = 0.0705
        dmax   = 1.6430
        alpha  = 0.4469
   ```

### Vérification rapide (après déploiement):

```bash
# Test de l'API
curl https://derive-labda-production.up.railway.app/

# Test du seuil
curl https://derive-labda-production.up.railway.app/current-threshold

# Test de prédiction
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

## 🚨 Si ça ne fonctionne pas

### Symptôme: Erreur de chargement du modèle dans les logs

**Solution 1 - Rollback via Railway Dashboard:**
1. Railway Dashboard > Deployments
2. Trouvez le déploiement précédent (avant aujourd'hui)
3. Cliquez "Redeploy"
4. ⏱️ 2-3 minutes pour revenir à la version stable

**Solution 2 - Rollback via Git:**
```bash
git reset --hard v1.0-stable
git push origin main --force
```

### Symptôme: Nouvelles dépendances ignorées

1. Service `thermostraw-api` → **Variables** :
   ```
   RAILWAY_INSTALL_COMMAND=python -m pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
   PYTHON_VERSION=3.11.9
   ```
2. Dernier déploiement → menu `⋮` → **Clear build cache** → **Redeploy**.

### Symptôme: Railway ne redéploie pas

1. Vérifiez que GitHub est bien connecté à Railway
2. Railway Dashboard > Settings > Vérifiez le lien GitHub
3. Déclenchement manuel: Railway Dashboard > Deploy Now

## 📊 Différences v1.0 → v2.0

| Aspect | v1.0-stable | v2.0-optimized |
|--------|-------------|----------------|
| Échantillons | 12 | **22** ✨ |
| RMSE | ~0.002 | **0.000751** ✨ |
| Paramètres | Non calibrés | **Calibrés** (15000 essais) ✨ |

## 📞 Besoin d'aide?

- **Documentation complète:** [ROLLBACK.md](ROLLBACK.md)
- **Fonctionnalité future:** [FEATURE_MODEL_UPLOAD.md](FEATURE_MODEL_UPLOAD.md)
- **Déploiement Railway:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Prêt?** Lancez `./deploy.sh` ! 🚀
