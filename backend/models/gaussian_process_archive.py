import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
from .ee_best import calculate_EE_best, calculate_R1p_log

class ThermalConductivityPredictor:
    """
    Modèle de prédiction de la conductivité thermique basé sur un processus gaussien
    avec l'indicateur EE_best et R1p_log
    """
    
    def __init__(self):
        """
        Initialise le modèle avec les paramètres optimisés du rapport de recherche
        """
        # Définition du noyau RBF avec longueurs caractéristiques spécifiques
        # Augmentation du WhiteKernel pour une meilleure estimation d'incertitude
        self.kernel = RBF([0.4, 0.4, 1.0]) + WhiteKernel(1e-3, noise_level_bounds="fixed")
        
        # Création du modèle GP
        self.model = GaussianProcessRegressor(
            kernel=self.kernel,
            optimizer=None,  # Pas d'optimisation des hyperparamètres
            normalize_y=True,
            random_state=0
        )
        
        # Initialisation des données d'entraînement
        self._initialize_training_data()
        
        # Entraînement initial du modèle
        self._train_model()
    
    def _initialize_training_data(self):
        """
        Initialise les données d'entraînement à partir du rapport de recherche
        """
        # Données des 12 échantillons du rapport
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
    
    def _train_model(self):
        """
        Entraîne le modèle GP sur les données disponibles
        """
        self.model.fit(self.X_train, self.y_train)
    
    def predict(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0):
        """
        Prédit la conductivité thermique à partir des fractions granulométriques
        
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
            Dictionnaire contenant:
            - 'lambda_predicted': la conductivité thermique prédite (W/m·K)
            - 'confidence_interval': l'intervalle de confiance à 90% (W/m·K)
            - 'status': le statut conforme/non conforme selon le seuil
        """
        # Vérification que la somme des fractions est proche de 100%
        total = taux_2mm + taux_1mm + taux_500um + taux_250um + taux_0
        if not (99.0 <= total <= 101.0):
            raise ValueError(f"La somme des fractions doit être proche de 100% (actuelle: {total:.2f}%)")
        
        # Calcul de R1p_log
        r1p_log = calculate_R1p_log(taux_500um, taux_250um)
        
        # Calcul de EE_best
        ee_best = calculate_EE_best(taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0)
        
        # Préparation des caractéristiques
        X_pred = np.array([[r1p_log, taux_250um, ee_best]])
        
        # Prédiction avec le modèle GP
        lambda_pred, std = self.model.predict(X_pred, return_std=True)
        
        # Debug: Affichage des valeurs pour diagnostic
        print(f"DEBUG - std brut: {std}")
        print(f"DEBUG - std[0]: {std[0] if len(std) > 0 else 'vide'}")
        print(f"DEBUG - lambda_pred: {lambda_pred[0]}")
        
        # Calcul de l'intervalle de confiance à 90% (1.645 au lieu de 1.96 pour 95%)
        # Assurer une incertitude minimale si trop faible
        raw_std = std[0] if len(std) > 0 else 0.0
        confidence_interval = max(1.645 * raw_std, 0.0001)  # Minimum 0.0001 pour éviter 0.0000
        
        # Seuil de conformité
        threshold = 0.045
        
        # Détermination du statut simplifié : conforme ou non conforme
        status = "conforme" if lambda_pred[0] <= threshold else "non_conforme"
        
        print(f"DEBUG - confidence_interval final: {confidence_interval}")
        
        return {
            "lambda_predicted": float(lambda_pred[0]),
            "confidence_interval": float(confidence_interval),
            "status": status,
            "r1p_log": float(r1p_log),
            "ee_best": float(ee_best),
            "threshold": threshold
        }
    
    def add_sample(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0, lambda_value):
        """
        Ajoute un nouvel échantillon à la base d'apprentissage et ré-entraîne le modèle
        
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
            Informations sur le modèle mis à jour
        """
        # Création du nouvel échantillon
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
        
        # Ajout aux données d'entraînement
        self.X_train = np.vstack([self.X_train, [r1p_log, taux_250um, ee_best]])
        self.y_train = np.append(self.y_train, lambda_value)
        
        # Ré-entraînement du modèle
        self._train_model()
        
        return {
            "message": "Échantillon ajouté et modèle mis à jour",
            "samples_count": len(self.samples)
        }