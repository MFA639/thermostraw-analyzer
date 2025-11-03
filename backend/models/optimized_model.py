"""
Modèle optimisé de prédiction de conductivité thermique
========================================================

Ce module charge le modèle Gaussian Process optimisé entraîné sur 22 échantillons
avec des paramètres calibrés par recherche aléatoire (15000 essais).

Amélioration par rapport à l'ancien modèle :
- 22 échantillons vs 12
- Paramètres EE optimisés
- RMSE de 0.000751 W/m·K
- MAE de 0.000484 W/m·K
"""

import numpy as np
import joblib
import os
import pickle
from pathlib import Path


class NumpyUnpickler(pickle.Unpickler):
    """Unpickler personnalisé pour gérer les incompatibilités NumPy"""
    def find_class(self, module, name):
        # Gérer l'incompatibilité du générateur aléatoire MT19937
        if module == 'numpy.random._mt19937' and name == 'MT19937':
            from numpy.random import MT19937
            return MT19937
        return super().find_class(module, name)

class OptimizedThermalConductivityPredictor:
    """
    Modèle optimisé utilisant le Gaussian Process calibré
    """

    def __init__(self):
        """Charge le modèle optimisé depuis le fichier .pkl"""
        # Chemin vers le modèle
        model_path = Path(__file__).parent / "modele_GP_conductivite_22lots.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Modèle non trouvé : {model_path}\n"
                "Assurez-vous que modele_GP_conductivite_22lots.pkl est dans le dossier models/"
            )

        # Chargement du modèle et des paramètres optimisés
        try:
            # Essai standard
            model_data = joblib.load(model_path)
        except (ValueError, AttributeError) as e:
            # Si échec (incompatibilité NumPy), utiliser l'unpickler personnalisé
            print(f"⚠️  Utilisation de l'unpickler personnalisé pour gérer l'incompatibilité NumPy")
            with open(model_path, 'rb') as f:
                model_data = NumpyUnpickler(f).load()

        self.model = model_data['GP']
        self.params = model_data['params']

        # Paramètres physiques (identiques au script de modélisation)
        self.ASPECT = {
            'taux_2mm': 12,
            'taux_1mm': 10,
            'taux_500um': 8,
            'taux_250um': 5,
            'taux_0': 3
        }

        self.SIZE = {
            'taux_2mm': 2.0,
            'taux_1mm': 1.0,
            'taux_500um': 0.5,
            'taux_250um': 0.25,
            'taux_0': 0.125
        }

        self.fractions = ['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0']

        print(f"✅ Modèle optimisé chargé avec succès")
        print(f"   Paramètres calibrés :")
        for param, value in self.params.items():
            print(f"     {param:6s} = {float(value):.4f}")

    def _calculate_R1p_log(self, taux_500um, taux_250um):
        """
        Calcule l'indice de répartition fines/intermédiaires

        Parameters:
        -----------
        taux_500um : float
            Pourcentage de particules 500µm
        taux_250um : float
            Pourcentage de particules 250µm

        Returns:
        --------
        float : Valeur de R1p_log
        """
        R1p = taux_250um / (taux_500um + taux_250um + 1e-10)
        return -np.log(R1p + 1e-10)

    def _calculate_EE_best_opt(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0):
        """
        Calcule l'interconnexion effective avec les paramètres optimisés

        Parameters:
        -----------
        taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0 : float
            Pourcentages des fractions granulométriques

        Returns:
        --------
        float : Valeur de EE_best_opt
        """
        # Extraction des paramètres optimisés
        k500 = float(self.params['k500'])
        k250 = float(self.params['k250'])
        c = float(self.params['c'])
        dmax = float(self.params['dmax'])
        alpha = float(self.params['alpha'])

        # Calcul du nombre effectif de particules
        values = [taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0]
        n = {}

        for i, f in enumerate(self.fractions):
            n[f] = values[i] / (self.SIZE[f]**2 * self.ASPECT[f])

        # Application des pondérations optimisées
        n['taux_500um'] /= k500
        n['taux_250um'] /= k250

        # Normalisation
        tot = sum(n.values())
        n = {f: v/tot for f, v in n.items()}

        # Calcul de la connectivité
        conn = sum(n[f] * (self.ASPECT[f] - 1) for f in n)

        # Pénalité due aux fines
        dust = min(taux_0 + c * taux_250um, dmax) / 100
        penalty = np.exp(-3 * dust)**alpha

        return conn * penalty

    def predict(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0):
        """
        Prédit la conductivité thermique avec le modèle optimisé

        Parameters:
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

        Returns:
        --------
        dict : Résultats de prédiction
            - lambda_predicted : conductivité thermique prédite (W/m·K)
            - confidence_interval : intervalle de confiance à 90%
            - status : conforme/non_conforme
            - r1p_log : valeur de R1p_log
            - ee_best : valeur de EE_best_opt
            - threshold : seuil de conformité
        """
        # Vérification de la somme des fractions
        total = taux_2mm + taux_1mm + taux_500um + taux_250um + taux_0
        if not (99.0 <= total <= 101.0):
            raise ValueError(
                f"La somme des fractions doit être proche de 100% (actuelle: {total:.2f}%)"
            )

        # Calcul des variables dérivées
        r1p_log = self._calculate_R1p_log(taux_500um, taux_250um)
        ee_best_opt = self._calculate_EE_best_opt(
            taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0
        )

        # Préparation des features pour le modèle
        X_pred = np.array([[r1p_log, taux_250um, ee_best_opt]])

        # Prédiction avec intervalle de confiance
        lambda_pred, std = self.model.predict(X_pred, return_std=True)

        # Intervalle de confiance à 90% (z-score = 1.645)
        confidence_interval = 1.645 * std[0]

        # Seuil de conformité (peut être modifié par l'API)
        threshold = 0.045

        # Détermination du statut
        status = "conforme" if lambda_pred[0] <= threshold else "non_conforme"

        return {
            "lambda_predicted": float(lambda_pred[0]),
            "confidence_interval": float(confidence_interval),
            "status": status,
            "r1p_log": float(r1p_log),
            "ee_best": float(ee_best_opt),
            "threshold": threshold,
            "model_info": {
                "name": "GP22 optimisé",
                "version": "v2.0-optimized",
                "date": "2025-11-03",
                "samples_count": 22,
                "rmse": 0.000751,
                "mae": 0.000484,
                "calibration_trials": 15000
            }
        }

    def add_sample(self, taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0, lambda_value):
        """
        Ajoute un nouvel échantillon (non implémenté pour le modèle .pkl)

        Note: Pour ajouter des échantillons, il faut réentraîner le modèle
        avec le script Scriptmodelisation.py
        """
        return {
            "message": "L'ajout d'échantillons nécessite un réentraînement complet",
            "action_required": "Utilisez le script Scriptmodelisation.py pour réentraîner"
        }
