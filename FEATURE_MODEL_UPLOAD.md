# 🚀 Fonctionnalité: Upload de Modèle via Interface

## 📝 Concept

Permettre l'upload d'un nouveau fichier de modèle (.pkl) directement depuis l'interface admin, sans redéploiement.

## ✅ Faisabilité

### Techniquement: **OUI, c'est possible!**

Cette fonctionnalité est réalisable avec quelques adaptations:

## 🏗️ Architecture Proposée

### Backend (FastAPI)

```python
# Nouveau endpoint dans backend/api/main.py

@app.post("/admin/upload-model")
async def upload_model(
    file: UploadFile = File(...),
    pin: str = Form(...)
):
    """Upload un nouveau modèle de prédiction"""

    # 1. Vérification du PIN
    if pin != ADMIN_PIN:
        raise HTTPException(403, "PIN incorrect")

    # 2. Validation du fichier
    if not file.filename.endswith('.pkl'):
        raise HTTPException(400, "Format invalide (attendu: .pkl)")

    # 3. Test de chargement du modèle
    try:
        content = await file.read()
        temp_model = joblib.loads(content)

        # Vérifier la structure attendue
        if 'GP' not in temp_model or 'params' not in temp_model:
            raise HTTPException(400, "Structure de modèle invalide")

    except Exception as e:
        raise HTTPException(400, f"Modèle invalide: {str(e)}")

    # 4. Sauvegarde du modèle
    backup_path = f"backend/models/modele_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
    shutil.copy("backend/models/modele_GP_conductivite_22lots.pkl", backup_path)

    # 5. Remplacement du modèle actif
    with open("backend/models/modele_GP_conductivite_22lots.pkl", 'wb') as f:
        f.write(content)

    # 6. Rechargement du modèle en mémoire
    global predictor
    predictor = ThermalConductivityPredictor()

    return {
        "success": True,
        "message": "Modèle mis à jour avec succès",
        "backup": backup_path
    }
```

### Frontend (React)

```jsx
// Nouveau composant: ModelUpload.js

import React, { useState } from 'react';
import axios from 'axios';

function ModelUpload({ apiUrl }) {
    const [pin, setPin] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pin', pin);

        setUploading(true);
        try {
            const response = await axios.post(
                `${apiUrl}/admin/upload-model`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            alert('✅ Modèle mis à jour avec succès!');
        } catch (error) {
            alert('❌ Erreur: ' + error.response?.data?.detail);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="model-upload">
            <h3>📤 Upload Nouveau Modèle</h3>
            <input
                type="password"
                placeholder="PIN Admin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
            />
            <input
                type="file"
                accept=".pkl"
                onChange={(e) => setFile(e.target.files[0])}
            />
            <button
                onClick={handleUpload}
                disabled={!pin || !file || uploading}
            >
                {uploading ? 'Upload en cours...' : 'Uploader le modèle'}
            </button>
        </div>
    );
}
```

## ⚠️ Contrainte Railway: Stockage Volatile

**PROBLÈME:** Par défaut sur Railway, les fichiers uploadés sont **perdus au redémarrage**.

### Solutions:

#### Option 1: Railway Volumes (RECOMMANDÉ)

```yaml
# railway.toml
[deploy]
volumeMounts = [
  { source = "/models", destination = "backend/models" }
]
```

- **Coût:** Gratuit jusqu'à 1GB
- **Persistance:** ✅ Survit aux redémarrages
- **Configuration:** Simple

#### Option 2: Stockage Externe (S3, etc.)

- Sauvegarder les modèles sur AWS S3 ou similaire
- Charger le modèle depuis S3 au démarrage
- **Coût:** Variable selon le fournisseur
- **Complexité:** Moyenne

#### Option 3: Base de Données (PostgreSQL)

- Stocker le modèle en BLOB dans une DB
- Railway propose PostgreSQL gratuit
- **Avantage:** Versioning facile
- **Inconvénient:** Limite de taille

## 🎯 Recommandation d'Implémentation

### Phase 1 (Maintenant - Sécurisation)
✅ Déployer la v2.0 avec plan de rollback
✅ Tags Git créés (v1.0-stable, v2.0-optimized)

### Phase 2 (Futur - Upload Interface)
1. Configurer Railway Volume pour `/models`
2. Ajouter l'endpoint `/admin/upload-model`
3. Créer le composant React `ModelUpload`
4. Ajouter validation et backup automatique
5. Logger tous les changements de modèle

### Phase 3 (Avancé - Gestion Multi-Modèles)
1. Interface pour basculer entre modèles
2. Historique des modèles uploadés
3. Comparaison de performances entre modèles
4. Tests A/B automatiques

## 🔐 Sécurité

- ✅ Authentification par PIN (déjà en place)
- ✅ Validation du format .pkl
- ✅ Test de chargement avant activation
- ✅ Backup automatique avant remplacement
- ⚠️ À ajouter: Limitation taille fichier (max 50MB)
- ⚠️ À ajouter: Rate limiting sur l'upload

## 📊 Estimation

- **Développement:** 4-6 heures
- **Tests:** 2 heures
- **Documentation:** 1 heure
- **Configuration Railway Volume:** 30 minutes

**Total:** ~1 journée de développement

## 🚀 Voulez-vous que j'implémente cette fonctionnalité?

Je peux le faire après le déploiement de la v2.0 si vous le souhaitez!
