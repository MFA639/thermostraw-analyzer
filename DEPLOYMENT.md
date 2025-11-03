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

### Fichiers concernés

- `backend/models/modele_GP_conductivite_22lots.pkl` – modèle optimisé prêt pour Railway
- `backend/models/optimized_model.py` – logique de chargement avec patch MT19937
- `requirements.txt` / `backend/requirements.txt` – versions épinglées

## 🚀 Déploiement sur Railway

Railway redéploie automatiquement à chaque push sur GitHub. Voici les étapes :

### Étape 1 : Vérifier les changements

```bash
git status
```

Vous devriez voir :
- `backend/models/modele_GP_conductivite_22lots.pkl` (modifié)
- `backend/models/optimized_model.py` (modifié si vous avez touché au chargeur)
- `requirements.txt` (si des dépendances ont changé)

### Étape 2 : Commit et push

```bash
# Exemple
git add backend/models/modele_GP_conductivite_22lots.pkl
git add backend/models/optimized_model.py
git add requirements.txt

git commit -m "Mise à jour du modèle optimisé"
git push origin main
```

### Étape 3 : Railway redéploie automatiquement

Railway détecte le push et :
1. ⏳ Clone le nouveau code
2. ⏳ Installe les dépendances (`requirements.txt` à la racine)
3. ⏳ Redémarre le service **thermostraw-api**
4. ✅ Le nouveau modèle est actif !

**Temps de déploiement estimé** : 2-3 minutes

### Étape 3bis : Forcer une installation propre (optionnel mais recommandé)

Dans le service `thermostraw-api` > onglet **Variables**, ajoutez si besoin :

```
RAILWAY_INSTALL_COMMAND = python -m pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
PYTHON_VERSION = 3.11.9
```

Ensuite, dans **Deployments**, ouvrez la dernière release > menu `⋮` > **Clear build cache** > **Redeploy**.  
Cela garantit l’utilisation de `numpy==1.26.2` (évite les wheels obsolètes).

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

> ℹ️ Si vous régénérez le modèle localement, exécutez `python create_compatible_model.py` pour écrire un pickle compatible Railway (sans dépendance à `MT19937`).

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

### Avertissement scikit-learn

```
InconsistentVersionWarning: Trying to unpickle estimator ... from version 1.7.x when using version 1.3.2.
```

Le modèle fonctionne malgré l’avertissement. Pour l’éliminer, régénérez le pickle avec `create_compatible_model.py` après avoir installé `scikit-learn==1.3.2` localement.

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
   python create_compatible_model.py  # écrit directement dans backend/models/
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
