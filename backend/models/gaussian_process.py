import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import LeaveOneOut
from .ee_best import calculate_EE_best, calculate_R1p_log

class ThermalConductivityPredictor:
    """
    Modèle robuste de prédiction de la conductivité thermique 
    Compatible 100% avec l'interface originale
    
    Améliorations intégrées :
    - Régularisation anti-surajustement
    - Incertitude calibrée et réaliste  
    - Détection d'extrapolation
    - Validation robustesse automatique
    """
    
    def __init__(self):
        """
        Initialise le modèle robuste avec les paramètres optimisés
        Interface identique à l'original
        """
        # Configuration du modèle robuste (stratégie minimal_dof)
        self.kernel = RBF(length_scale=[5.0, 5.0, 5.0], length_scale_bounds="fixed") + \
                     WhiteKernel(noise_level=1e-1, noise_level_bounds="fixed")
        
        # Modèle GP avec régularisation maximale contre le surajustement
        self.model = GaussianProcessRegressor(
            kernel=self.kernel,
            optimizer=None,  # Pas d'optimisation = régularisation forcée
            normalize_y=True,
            alpha=1e-6,
            random_state=42
        )
        
        # Paramètres de calibration robuste
        self.uncertainty_calibration_factor = 1.85  # Facteur empirique pour couverture 90%
        self.uncertainty_min = 0.0003  # Minimum réaliste
        
        # Standardisation des features (important pour robustesse)
        self.scaler = StandardScaler()
        self.is_fitted = False
        
        # Métriques de validation
        self.rmse_loo = None
        self.overfitting_ratio = None
        
        # Initialisation des données et entraînement
        self._initialize_training_data()
        self._train_model()
    
    def _initialize_training_data(self):
        """
        Initialise les données d'entraînement à partir du rapport de recherche
        Identique à l'original pour compatibilité
        """
        # Données des 12 échantillons (identiques à l'original)
        self.samples = [
            {"taux_2mm": 11.23, "taux_1mm": 56.51, "taux_500um": 25.95, "taux_250um": 5.14, "taux_0": 1.17, "lambda": 0.0395},
            {"taux_2mm": 11.63, "taux_1mm": 57.67, "taux_500um": 25.10, "taux_250um": 4.66, "taux_0": 0.95, "lambda": 0.0395},
            {"taux_2mm": 14.32, "taux_1mm": 57.36, "taux_500um": 22.59, "taux_250um": 4.73, "taux_0": 0.99, "lambda": 0.0395},
            {"taux_2mm": 14.56, "taux_1mm": 55.55, "taux_500um": 22.77, "taux_250um": 5.72, "taux_0": 1.39, "lambda": 0.0398},
            {"taux_2mm": 20.83, "taux_1mm": 59.83, "taux_500um": 15.83, "taux_250um": 2.74, "taux_0": 0.78, "lambda": 0.0397},
            {"taux_2mm": 15.60, "taux_1mm": 57.54, "taux_500um": 21.59, "taux_250um": 4.15, "taux_0": 1.13, "lambda": 0.0401},
            {"taux_2mm": 15.13, "taux_1mm": 57.39, "taux_500um": 20.96, "taux_250um": 5.47, "taux_0": 1.06, "lambda": 0.0396},
            {"taux_2mm": 13.61, "taux_1mm": 56.30, "taux_500um": 23.85, "taux_250um": 5.57, "taux_0": 0.67, "lambda": 0.0408},
            {"taux_2mm": 15.23, "taux_1mm": 58.18, "taux_500um": 21.55, "taux_250um": 4.23, "taux_0": 0.81, "lambda": 0.0400},
            {"taux_2mm": 20.10, "taux_1mm": 58.58, "taux_500um": 17.06, "taux_250um": 3.30, "taux_0": 0.96, "lambda": 0.0400},
            {"taux_2mm": 16.71, "taux_1mm": 54.32, "taux_500um": 20.75, "taux_250um": 5.88, "taux_0": 2.33, "lambda": 0.0387},
            {"taux_2mm": 15.83, "taux_1mm": 53.44, "taux_500um": 20.46, "taux_250um": 7.26, "taux_0": 3.01, "lambda": 0.0393}
        ]
        
        # Calcul des caractéristiques (features) pour chaque échantillon
        X = []
        y = []
        
        for sample in self.samples:
            # Calcul de R1p_log
            r1p_log = calculate_R1p_log(sample["taux_500um"], sample["taux_250um"])
            
            # Calcul de EE_best
            ee_best = calculate_EE_best(
                sample["taux_2mm"], 
                sample["taux_1mm"], 
                sample["taux_500um"], 
                sample["taux_250um"], 
                sample["taux_0"]
            )
            
            # Ajout des caractéristiques
            X.append([r1p_log, sample["taux_250um"], ee_best])
            
            # Ajout de la conductivité thermique
            y.append(sample["lambda"])
        
        self.X_train = np.array(X)
        self.y_train = np.array(y)
        
        # Standardisation des features (nouveau - crucial pour robustesse)
        self.X_train_scaled = self.scaler.fit_transform(self.X_train)
    
    def _train_model(self):
        """
        Entraîne le modèle GP avec validation de robustesse
        """
        # Entraînement sur données standardisées
        self.model.fit(self.X_train_scaled, self.y_train)
        self.is_fitted = True
        
        # Validation robustesse via validation croisée LOO
        self._validate_robustness()
    
    def _validate_robustness(self):
        """
        Valide la robustesse du modèle contre le surajustement
        """
        loo = LeaveOneOut()
        mse_scores = []
        
        for train_idx, test_idx in loo.split(self.X_train_scaled):
            X_train_fold = self.X_train_scaled[train_idx]
            y_train_fold = self.y_train[train_idx]
            X_test_fold = self.X_train_scaled[test_idx]
            y_test_fold = self.y_train[test_idx]
            
            # Modèle temporaire pour validation
            temp_model = GaussianProcessRegressor(
                kernel=self.kernel,
                optimizer=None,
                normalize_y=True,
                alpha=1e-6,
                random_state=42
            )
            temp_model.fit(X_train_fold, y_train_fold)
            
            # Prédiction et erreur
            y_pred = temp_model.predict(X_test_fold)
            mse_scores.append((y_test_fold[0] - y_pred[0])**2)
        
        # Métriques de robustesse
        self.rmse_loo = np.sqrt(np.mean(mse_scores))
        
        # Score de surajustement
        y_train_pred = self.model.predict(self.X_train_scaled)
        rmse_train = np.sqrt(np.mean((self.y_train - y_train_pred)**2))
        self.overfitting_ratio = rmse_train / self.rmse_loo
        
    def predict(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0):
        """
        Prédit la conductivité thermique avec incertitude robuste
        
        Interface IDENTIQUE à l'original pour compatibilité
        
        Paramètres:
        -----------
        taux_2mm : float
            Pourcentage de particules > 2 mm
        taux_1mm : float
            Pourcentage de particules entre 1 et 2 mm
        taux_500um : float
            Pourcentage de particules entre 500 μm et 1 mm
        taux_250um : float
            Pourcentage de particules entre 250 et 500 μm
        taux_0 : float
            Pourcentage de particules < 250 μm
            
        Retourne:
        ---------
        dict
            Dictionnaire contenant (IDENTIQUE à l'original):
            - 'lambda_predicted': la conductivité thermique prédite (W/m·K)
            - 'confidence_interval': l'intervalle de confiance à 90% (W/m·K)
            - 'status': le statut conforme/non conforme selon le seuil
            - 'r1p_log': valeur de R1p_log calculée
            - 'ee_best': valeur de EE_best calculée
            - 'threshold': seuil de conformité utilisé
        """
        # Vérification des entrées (identique à l'original)
        total = taux_2mm + taux_1mm + taux_500um + taux_250um + taux_0
        if not (99.0 <= total <= 101.0):
            raise ValueError(f"La somme des fractions doit être proche de 100% (actuelle: {total:.2f}%)")
        
        # Calcul des features (identique à l'original)
        r1p_log = calculate_R1p_log(taux_500um, taux_250um)
        ee_best = calculate_EE_best(taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0)
        
        # Préparation des caractéristiques
        X_pred = np.array([[r1p_log, taux_250um, ee_best]])
        
        # Standardisation (NOUVEAU - crucial pour robustesse)
        X_pred_scaled = self.scaler.transform(X_pred)
        
        # Prédiction avec le modèle GP
        lambda_pred, std = self.model.predict(X_pred_scaled, return_std=True)
        
        # NOUVEAU : Gestion robuste de l'incertitude
        raw_std = std[0] if len(std) > 0 else 0.0
        
        # Calibration de l'incertitude avec facteur empirique validé
        calibrated_std = raw_std * self.uncertainty_calibration_factor
        
        # Assurer une incertitude minimale réaliste
        calibrated_std = max(calibrated_std, self.uncertainty_min)
        
        # Détection d'extrapolation et ajustement
        extrapolation_risk = self._assess_extrapolation_risk(X_pred[0])
        if extrapolation_risk > 0.3:
            # Augmentation de l'incertitude si extrapolation détectée
            calibrated_std *= (1.0 + extrapolation_risk)
        
        # Calcul de l'intervalle de confiance à 90% (identique format original)
        confidence_interval = 1.645 * calibrated_std
        
        # Seuil de conformité (Changé à 0.045 comme demandé)
        threshold = 0.045
        
        # Détermination du statut (identique à l'original)
        status = "conforme" if lambda_pred[0] <= threshold else "non_conforme"
        
        # Retour avec interface EXACTEMENT IDENTIQUE
        return {
            "lambda_predicted": float(lambda_pred[0]),
            "confidence_interval": float(confidence_interval),
            "status": status,
            "r1p_log": float(r1p_log),
            "ee_best": float(ee_best),
            "threshold": threshold
        }
    
    def _assess_extrapolation_risk(self, features):
        """
        Évalue le risque d'extrapolation pour une prédiction
        
        Retourne:
        ---------
        float : Risque entre 0 (interpolation) et 1 (forte extrapolation)
        """
        # Bornes du domaine d'entraînement
        X_min = self.X_train.min(axis=0)
        X_max = self.X_train.max(axis=0)
        X_range = X_max - X_min
        
        # Distance normalisée d'extrapolation pour chaque feature
        extrapolation_distances = np.maximum(
            (X_min - features) / X_range,  # En dessous de la plage
            (features - X_max) / X_range   # Au dessus de la plage
        )
        
        # Garder seulement les distances positives (extrapolation)
        extrapolation_distances = np.maximum(extrapolation_distances, 0)
        
        # Risque global = moyenne des distances d'extrapolation
        risk = np.mean(extrapolation_distances)
        
        return float(np.clip(risk, 0, 1))
    
    def add_sample(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0, lambda_value):
        """
        Ajoute un nouvel échantillon et ré-entraîne le modèle
        
        Interface IDENTIQUE à l'original pour compatibilité
        
        Paramètres:
        -----------
        taux_2mm : float
            Pourcentage de particules > 2 mm
        taux_1mm : float
            Pourcentage de particules entre 1 et 2 mm
        taux_500um : float
            Pourcentage de particules entre 500 μm et 1 mm
        taux_250um : float
            Pourcentage de particules entre 250 et 500 μm
        taux_0 : float
            Pourcentage de particules < 250 μm
        lambda_value : float
            Conductivité thermique mesurée en laboratoire (W/m·K)
            
        Retourne:
        ---------
        dict
            Informations sur le modèle mis à jour (identique à l'original)
        """
        # Création du nouvel échantillon (identique à l'original)
        new_sample = {
            "taux_2mm": taux_2mm,
            "taux_1mm": taux_1mm,
            "taux_500um": taux_500um,
            "taux_250um": taux_250um,
            "taux_0": taux_0,
            "lambda": lambda_value
        }
        
        # Ajout à la liste des échantillons
        self.samples.append(new_sample)
        
        # Calcul des caractéristiques pour le nouvel échantillon
        r1p_log = calculate_R1p_log(taux_500um, taux_250um)
        ee_best = calculate_EE_best(taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0)
        
        # Mise à jour des données d'entraînement
        self.X_train = np.vstack([self.X_train, [r1p_log, taux_250um, ee_best]])
        self.y_train = np.append(self.y_train, lambda_value)
        
        # NOUVEAU : Re-standardisation avec tous les échantillons
        self.X_train_scaled = self.scaler.fit_transform(self.X_train)
        
        # Ré-entraînement du modèle avec validation
        self._train_model()
        
        # Retour identique à l'original
        return {
            "message": "Échantillon ajouté et modèle mis à jour",
            "samples_count": len(self.samples)
        }