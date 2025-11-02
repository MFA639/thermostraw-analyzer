# Guide de déploiement sur Railway

## 📋 Vue d'ensemble

Votre application ThermoStraw Analyzer est déployée sur Railway avec deux services :
1. **derive-labda** : Frontend (interface utilisateur)
2. **thermostraw-api** : Backend API (serveur FastAPI)

URL de l'application : https://derive-labda-production.up.railway.app/

## 🔄 Mise à jour du modèle

### Ce qui a changé

Le nouveau modèle optimisé offre :
- ✅ **22 échantillons** (vs 12 auparavant)
- ✅ **Paramètres calibrés** par recherche aléatoire (15000 essais)
- ✅ **RMSE de 0.000751 W/m·K** (erreur très faible)
- ✅ **MAE de 0.000484 W/m·K**

### Fichiers modifiés

1. `backend/models/modele_GP_conductivite_22lots.pkl` - Nouveau modèle optimisé
2. `backend/models/optimized_model.py` - Module de chargement du modèle
3. `backend/api/main.py` - API mise à jour pour utiliser le nouveau modèle

## 🚀 Déploiement sur Railway

Railway redéploie automatiquement à chaque push sur GitHub. Voici les étapes :

### Étape 1 : Vérifier les changements

```bash
git status
```

Vous devriez voir :
- `backend/models/modele_GP_conductivite_22lots.pkl` (nouveau)
- `backend/models/optimized_model.py` (nouveau)
- `backend/api/main.py` (modifié)

### Étape 2 : Commit et push vers GitHub

```bash
# Ajouter tous les fichiers modifiés
git add backend/models/modele_GP_conductivite_22lots.pkl
git add backend/models/optimized_model.py
git add backend/api/main.py
git add DEPLOYMENT.md

# Créer un commit
git commit -m "✨ Mise à jour avec modèle optimisé (22 échantillons, RMSE: 0.000751)"

# Pousser vers GitHub
git push origin main
```

### Étape 3 : Railway redéploie automatiquement

Railway détecte le push et :
1. ⏳ Clone le nouveau code
2. ⏳ Installe les dépendances (`requirements.txt`)
3. ⏳ Redémarre le service **thermostraw-api**
4. ✅ Le nouveau modèle est actif !

**Temps de déploiement estimé** : 2-3 minutes

### Étape 4 : Vérifier le déploiement

1. **Ouvrir Railway Dashboard** : https://railway.app/dashboard
2. **Aller dans le projet** : thermostraw-analyzer
3. **Vérifier le service** : thermostraw-api
4. **Consulter les logs** pour voir :
   ```
   ✅ Modèle optimisé chargé avec succès
      Paramètres calibrés :
        k500   = 1.5104
        k250   = 7.9803
        c      = 0.0705
        dmax   = 1.6430
        alpha  = 0.4469
   ```

5. **Tester l'API** :
   ```bash
   curl https://derive-labda-production.up.railway.app/
   ```

## 🧪 Test local avant déploiement (optionnel)

Si vous voulez tester localement avant de déployer :

```bash
# Aller dans le dossier backend
cd backend

# Activer l'environnement virtuel (si vous l'avez configuré)
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur local
uvicorn api.main:app --reload --port 8000

# Tester dans un autre terminal
curl http://localhost:8000/
```

## 📊 Comparaison avant/après

| Métrique | Ancien modèle | Nouveau modèle |
|----------|---------------|----------------|
| Échantillons | 12 | **22** |
| RMSE | ~0.002 | **0.000751** |
| MAE | ~0.001 | **0.000484** |
| Paramètres | Manuels | **Optimisés** |

## 🔧 Dépannage

### Le modèle ne se charge pas

**Erreur** : `FileNotFoundError: modele_GP_conductivite_22lots.pkl`

**Solution** :
1. Vérifier que le fichier existe dans `backend/models/`
2. Vérifier que le commit contient le fichier .pkl
3. Vérifier les logs Railway pour voir l'erreur exacte

### L'API utilise l'ancien modèle

**Solution** :
1. Vérifier dans les logs Railway si le message "✅ Modèle optimisé chargé" apparaît
2. Si non, vérifier que `optimized_model.py` est présent
3. Redémarrer manuellement le service sur Railway

### Les prédictions semblent incorrectes

**Solution** :
1. Vérifier que les fractions granulométriques totalisent ~100%
2. Consulter les logs pour voir les valeurs de R1p_log et EE_best
3. Comparer avec les résultats du script `Scriptmodelisation.py`

## 📝 Réentraînement du modèle

Si vous ajoutez de nouveaux échantillons :

1. Mettre à jour `dataset/datasetConductivite.xlsx`
2. Lancer le script de modélisation :
   ```bash
   source thermostraw-analyzer/bin/activate
   python Scriptmodelisation.py
   ```
3. Copier le nouveau modèle :
   ```bash
   cp modele_GP_conductivite_22lots.pkl backend/models/
   ```
4. Commit et push comme décrit ci-dessus

## 🔗 Liens utiles

- **Application** : https://derive-labda-production.up.railway.app/
- **Railway Dashboard** : https://railway.app/dashboard
- **GitHub Repository** : https://github.com/MFA639/thermostraw-analyzer
- **Documentation Railway** : https://docs.railway.app/

## ✅ Checklist de déploiement

- [ ] Modèle généré avec `Scriptmodelisation.py`
- [ ] Fichier .pkl copié dans `backend/models/`
- [ ] Code testé localement (optionnel)
- [ ] Changements committés
- [ ] Push vers GitHub effectué
- [ ] Déploiement Railway vérifié
- [ ] API testée en production
- [ ] Logs vérifiés pour confirmer le chargement du modèle
