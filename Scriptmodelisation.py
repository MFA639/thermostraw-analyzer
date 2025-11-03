"""
Script de modélisation de la conductivité thermique des matériaux biosourcés
=============================================================================

Ce script effectue une modélisation prédictive de la conductivité thermique
d'un matériau (paille ou isolant biosourcé) en fonction de sa distribution
granulométrique (répartition des tailles de particules).

Étapes principales :
1. Chargement et nettoyage des données granulométriques
2. Calcul de variables dérivées (R1p_log, EE_best)
3. Validation initiale avec Gaussian Process Regressor
4. Calibration par recherche aléatoire (15000 essais)
5. Validation finale et export du modèle optimisé

Auteur: Récupéré de Google Colab
Date: 2025
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import random
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
from sklearn.model_selection import LeaveOneOut
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from datetime import datetime

# Configuration matplotlib pour exécution en arrière-plan
plt.style.use('default')
plt.ioff()  # Désactiver le mode interactif

# ============================================================================
# SECTION 1 : CHARGEMENT ET NETTOYAGE DES DONNÉES
# ============================================================================

print("=" * 80)
print("SECTION 1 : Chargement et nettoyage des données")
print("=" * 80)

# Lecture du fichier Excel depuis le dossier dataset
df = pd.read_excel("dataset/datasetConductivite.xlsx")

# Nettoyage des noms de colonnes
# Remplacement des caractères spéciaux et normalisation
df.columns = [
    c.strip()
    .replace("µm", "um")
    .replace(" ", "_")
    .replace(">", "taux_")
    .replace("<", "taux_0_")
    for c in df.columns
]

# Renommage des colonnes pour uniformiser avec les scripts GP
df.rename(columns={
    "taux_2mm(%)": "taux_2mm",
    "taux_1mm(%)": "taux_1mm",
    "taux_500_um(%)": "taux_500um",
    "taux_250_um(%)": "taux_250um",
    "taux_0_250_um(%)": "taux_0",
    "Conductivité_Codem_(W/m.K)": "lambda",
    # Variantes possibles selon le fichier source
    'taux__2mm(%)': 'taux_2mm',
    'taux__1mm(%)': 'taux_1mm',
    'taux__500_um(%)': 'taux_500um',
    'taux__250_um(%)': 'taux_250um',
    'taux_0__250_um(%)': 'taux_0'
}, inplace=True)

# Sélection des colonnes pertinentes uniquement
# - taux_Xmm/um : pourcentages des différentes fractions granulométriques
# - lambda : conductivité thermique mesurée (variable cible)
df = df[['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0', 'lambda']]

# Affichage pour vérification
print("\n📊 Aperçu des données :")
print(df.head())
print(f"\n✅ Nombre de lots : {len(df)}")
print(f"✅ Colonnes : {df.columns.tolist()}")



# ============================================================================
# SECTION 2 : CALCUL DES VARIABLES DÉRIVÉES
# ============================================================================

print("\n" + "=" * 80)
print("SECTION 2 : Calcul des variables dérivées")
print("=" * 80)

# Liste des fractions granulométriques
fractions = ['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0']

# Paramètres physiques des particules
# ASPECT : rapport longueur/largeur moyen des particules
ASPECT = {
    'taux_2mm': 12,    # Particules les plus allongées
    'taux_1mm': 10,
    'taux_500um': 8,
    'taux_250um': 5,
    'taux_0': 3        # Particules fines plus sphériques
}

# SIZE : taille moyenne des particules (en mm)
SIZE = {
    'taux_2mm': 2.0,
    'taux_1mm': 1.0,
    'taux_500um': 0.5,
    'taux_250um': 0.25,
    'taux_0': 0.125    # Estimation pour les fines < 250 µm
}

# === 1️⃣ Calcul de R1p_log (indice de répartition fines/intermédiaires) ===
# Mesure la proportion de particules fines (250µm) parmi les particules moyennes
# Le logarithme permet de linéariser la relation avec la conductivité
R1p = df['taux_250um'] / (df['taux_500um'] + df['taux_250um'] + 1e-10)
df['R1p_log'] = -np.log(R1p + 1e-10)

# === 2️⃣ Calcul de EE_best (Effective Entanglement) ===
# Paramètre d'interconnexion effectif basé sur un modèle physique
# Paramètres initiaux (seront optimisés plus tard)
params_best = dict(
    k500=1.83,     # Coefficient de pondération pour fraction 500µm
    k250=3.04,     # Coefficient de pondération pour fraction 250µm
    c=0.196,       # Coefficient d'influence des fines
    dmax=1.76,     # Seuil maximal de poussière
    alpha=0.572    # Exposant de la pénalité de poussière
)

def EE_best(row, p=params_best):
    """
    Calcule l'interconnexion effective (Effective Entanglement).

    Cette fonction modélise comment les particules s'enchevêtrent en fonction :
    - De leur taille et forme (ASPECT, SIZE)
    - De pondérations spécifiques (k500, k250)
    - De la présence de fines qui réduisent l'interconnexion (penalty)

    Parameters:
    -----------
    row : pandas.Series
        Ligne du DataFrame contenant les fractions granulométriques
    p : dict
        Dictionnaire des paramètres (k500, k250, c, dmax, alpha)

    Returns:
    --------
    float : Valeur d'interconnexion effective
    """
    k500, k250, c, dmax, alpha = p.values()

    # Calcul du nombre effectif de particules pour chaque fraction
    n = {}
    for f in fractions:
        n[f] = row[f] / (SIZE[f]**2 * ASPECT[f])

    # Application des pondérations pour 500µm et 250µm
    n['taux_500um'] /= k500
    n['taux_250um'] /= k250

    # Normalisation
    tot = sum(n.values())
    n = {f: v/tot for f, v in n.items()}

    # Calcul de la connectivité basée sur le ratio d'aspect
    conn = sum(n[f] * (ASPECT[f] - 1) for f in n)

    # Pénalité due aux fines (poussières) qui bouchent les pores
    dust = min(row['taux_0'] + c * row['taux_250um'], dmax) / 100
    penalty = np.exp(-3 * dust)**alpha

    return conn * penalty

# Application du calcul EE_best à toutes les lignes
df['EE_best'] = df.apply(EE_best, axis=1)

print("\n📊 Variables dérivées calculées :")
print(df[['taux_500um', 'taux_250um', 'taux_0', 'R1p_log', 'EE_best']].head())
print(f"\n✅ R1p_log : min={df['R1p_log'].min():.3f}, max={df['R1p_log'].max():.3f}")
print(f"✅ EE_best : min={df['EE_best'].min():.3f}, max={df['EE_best'].max():.3f}")



# ============================================================================
# SECTION 3 : VALIDATION INITIALE AVEC GAUSSIAN PROCESS
# ============================================================================

print("\n" + "=" * 80)
print("SECTION 3 : Validation initiale avec modèle Gaussian Process")
print("=" * 80)

# Préparation des données pour le modèle
# Variables d'entrée (features) : R1p_log, taux_250um, EE_best
# Variable de sortie (target) : lambda (conductivité thermique)
X = df[['R1p_log', 'taux_250um', 'EE_best']].values
y = df['lambda'].values

print(f"\n📊 Données d'entraînement : {X.shape[0]} échantillons, {X.shape[1]} variables")

# Définition du noyau du processus gaussien
# RBF (Radial Basis Function) : noyau à base radiale pour capturer les non-linéarités
# WhiteKernel : bruit blanc pour modéliser l'incertitude de mesure
kernel = RBF([0.4, 0.4, 1.0]) + WhiteKernel(1e-4, noise_level_bounds="fixed")

# Création du modèle Gaussian Process Regressor
GP = GaussianProcessRegressor(
    kernel=kernel,
    optimizer=None,          # Pas d'optimisation des hyperparamètres du noyau
    normalize_y=True,        # Normalisation de la variable cible
    random_state=0
)

# Validation croisée Leave-One-Out (LOO)
# Pour chaque échantillon : entraîne sur tous les autres, teste sur celui-ci
# Donne une estimation robuste de la performance sur de petits jeux de données
print("\n🔄 Validation croisée Leave-One-Out en cours...")
loo = LeaveOneOut()
pred = np.zeros_like(y)

for tr, ts in loo.split(X):
    GP.fit(X[tr], y[tr])
    pred[ts] = GP.predict(X[ts])

# Calcul des métriques de performance
rmse = np.sqrt(mean_squared_error(y, pred))
r2 = r2_score(y, pred)

print(f"\n📈 Résultats de validation :")
print(f"   RMSE LOO : {rmse:.6f} W/m·K")
print(f"   R² LOO   : {r2:.3f}")

# Visualisation : Valeurs mesurées vs prédites
plt.figure(figsize=(8, 8))
plt.scatter(y, pred, color='blue', s=80, alpha=0.6, edgecolors='black', linewidth=0.5)
lims = [y.min()*0.999, y.max()*1.001]
plt.plot(lims, lims, 'r--', linewidth=2, label="Prédiction parfaite (y=x)")
plt.fill_between(lims, [l-0.002 for l in lims], [l+0.002 for l in lims],
                 color='green', alpha=0.2, label='Tolérance ±0.002 W/m·K')
plt.xlabel("Conductivité mesurée (W/m·K)", fontsize=12)
plt.ylabel("Conductivité prédite (W/m·K)", fontsize=12)
plt.title("Validation Leave-One-Out – Modèle GP (EE_best initial)", fontsize=14, fontweight='bold')
plt.legend(fontsize=10)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('validation_initiale_GP.png', dpi=150)
print("✅ Graphique sauvegardé : validation_initiale_GP.png")
plt.close()  # Fermer au lieu de show() pour exécution en arrière-plan



# ============================================================================
# SECTION 4 : CALIBRATION PAR RECHERCHE ALÉATOIRE (RANDOM SEARCH)
# ============================================================================

print("\n" + "=" * 80)
print("SECTION 4 : Calibration des paramètres EE par recherche aléatoire")
print("=" * 80)
print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Début de la section 4 - Calibration")

def EE_general(row, k500, k250, c, dmax, alpha):
    """
    Version généralisée de la fonction EE avec paramètres ajustables.

    Cette fonction permet de tester différentes combinaisons de paramètres
    pour optimiser la prédiction de la conductivité thermique.

    Parameters:
    -----------
    row : pandas.Series
        Ligne du DataFrame contenant les fractions granulométriques
    k500 : float
        Coefficient de pondération pour fraction 500µm (plage: 1.5-4.0)
    k250 : float
        Coefficient de pondération pour fraction 250µm (plage: 3.0-8.0)
    c : float
        Coefficient d'influence des fines (plage: 0.05-0.2)
    dmax : float
        Seuil maximal de poussière (plage: 1.0-2.0)
    alpha : float
        Exposant de la pénalité de poussière (plage: 0.3-0.6)

    Returns:
    --------
    float : Valeur d'interconnexion effective
    """
    n = {}
    for f in fractions:
        n[f] = row[f] / (SIZE[f]**2 * ASPECT[f])
    n['taux_500um'] /= k500
    n['taux_250um'] /= k250
    tot = sum(n.values())
    n = {f: v/tot for f, v in n.items()}
    conn = sum(n[f] * (ASPECT[f] - 1) for f in n)
    dust = min(row['taux_0'] + c * row['taux_250um'], dmax) / 100
    penalty = np.exp(-3 * dust)**alpha
    return conn * penalty

# Configuration de la recherche aléatoire
N_TRY = 15000  # Nombre de combinaisons de paramètres à tester
random.seed(0)  # Reproductibilité

print(f"\n🔍 Lancement de la recherche aléatoire : {N_TRY} combinaisons")
print("   Plages de recherche :")
print("   - k500  : [1.5, 4.0]")
print("   - k250  : [3.0, 8.0]")
print("   - c     : [0.05, 0.2]")
print("   - dmax  : [1.0, 2.0]")
print("   - alpha : [0.3, 0.6]")

records = []
y = df['lambda'].values

# Barre de progression améliorée
print("\n⏳ Progression :")
start_time = datetime.now()
for itr in range(N_TRY):
    # Affichage de la progression tous les 500 essais
    if (itr + 1) % 500 == 0:
        elapsed = (datetime.now() - start_time).total_seconds()
        estimated_total = (elapsed / (itr + 1)) * N_TRY
        remaining = estimated_total - elapsed
        print(f"   [{datetime.now().strftime('%H:%M:%S')}] {itr + 1}/{N_TRY} combinaisons ({100*(itr+1)/N_TRY:.1f}%) - Temps restant estimé: {int(remaining//60)}m {int(remaining%60)}s")

    # Tirage aléatoire des 5 paramètres dans leurs plages respectives
    k500 = random.uniform(1.5, 4.0)
    k250 = random.uniform(3.0, 8.0)
    c = random.uniform(0.05, 0.2)
    dmax = random.uniform(1.0, 2.0)
    alpha = random.uniform(0.3, 0.6)

    # Calcul de EE pour ces paramètres
    df['EE'] = df.apply(EE_general, axis=1, args=(k500, k250, c, dmax, alpha))
    X = df[['R1p_log', 'taux_250um', 'EE']].values

    # Validation Leave-One-Out
    preds = np.zeros_like(y)
    GP = GaussianProcessRegressor(kernel=kernel, optimizer=None, normalize_y=True)
    for tr, ts in loo.split(X):
        GP.fit(X[tr], y[tr])
        preds[ts] = GP.predict(X[ts])
    rmse = np.sqrt(mean_squared_error(y, preds))

    # Test de robustesse : injection de bruit ±5% sur les données d'entrée
    # Simule des variations de mesure pour évaluer la stabilité du modèle
    noise = 1 + 0.05 * np.random.randn(*df[fractions].shape)
    noisy = df[fractions] * noise
    noisy = noisy.clip(lower=0)  # Pas de valeurs négatives

    # Recalcul des features avec données bruitées
    R1p_noisy = noisy['taux_250um'] / (noisy['taux_500um'] + noisy['taux_250um'] + 1e-10)
    X_noisy = np.column_stack([
        -np.log(R1p_noisy + 1e-10),
        noisy['taux_250um'],
        noisy.apply(EE_general, axis=1, args=(k500, k250, c, dmax, alpha))
    ])
    pred_noisy = GP.predict(X_noisy)
    rmse_noisy = np.sqrt(mean_squared_error(y, pred_noisy))

    # Enregistrement des résultats
    records.append((rmse, rmse_noisy, k500, k250, c, dmax, alpha))

print(f"✅ Recherche terminée : {N_TRY} combinaisons testées\n")

# Tri par RMSE puis par robustesse
cols = ['RMSE', 'RMSE_noisy', 'k500', 'k250', 'c', 'dmax', 'alpha']
best_df = pd.DataFrame(sorted(records, key=lambda x: (x[0], x[1]))[:10], columns=cols)

print("🏆 Top 10 combinaisons les plus performantes :")
print(best_df.to_string(index=False))

# Visualisation : RMSE nominal vs RMSE avec bruit
plt.figure(figsize=(10, 7))
plt.scatter([r[0] for r in records], [r[1] for r in records],
            s=4, alpha=0.2, color='gray', label='Toutes les combinaisons')
plt.scatter(best_df['RMSE'], best_df['RMSE_noisy'],
            c='red', s=100, edgecolors='darkred', linewidth=1.5,
            label='Top 10', zorder=5)
plt.xlabel('RMSE LOO (W/m·K)', fontsize=12)
plt.ylabel('RMSE avec bruit ±5% (W/m·K)', fontsize=12)
plt.title('Calibration des paramètres EE – 15000 essais', fontsize=14, fontweight='bold')
plt.legend(fontsize=10)
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('calibration_random_search.png', dpi=150)
print("\n✅ Graphique sauvegardé : calibration_random_search.png")
plt.close()  # Fermer au lieu de show() pour exécution en arrière-plan

# Sélection du meilleur jeu de paramètres
b0 = best_df.iloc[0]
params_best = dict(k500=b0.k500, k250=b0.k250, c=b0.c, dmax=b0.dmax, alpha=b0.alpha)

print(f"\n🎯 Meilleurs paramètres sélectionnés :")
for param, value in params_best.items():
    print(f"   {param:6s} = {value:.4f}")

# Entraînement du modèle GP avec les meilleurs paramètres
df['EE_best_opt'] = df.apply(EE_general, axis=1, args=tuple(params_best.values()))
X_best = df[['R1p_log', 'taux_250um', 'EE_best_opt']].values

GP_best = GaussianProcessRegressor(kernel=kernel, optimizer=None, normalize_y=True)
GP_best.fit(X_best, y)

# Sauvegarde du modèle
joblib.dump({'GP': GP_best, 'params': params_best}, 'modele_GP_best.pkl')
print("\n✅ Modèle enregistré : modele_GP_best.pkl")



# ============================================================================
# SECTION 5 : VALIDATION FINALE DU MODÈLE CALIBRÉ
# ============================================================================

print("\n" + "=" * 80)
print("SECTION 5 : Validation finale du modèle calibré")
print("=" * 80)

# Rechargement du modèle calibré
GP_best_loaded = joblib.load("modele_GP_best.pkl")['GP']
params_best = joblib.load("modele_GP_best.pkl")['params']

print("\n📂 Modèle chargé : modele_GP_best.pkl")
print(f"   Paramètres : {params_best}")

# Recalcul de EE_best_opt pour cohérence avec les paramètres optimisés
df['EE_best_opt'] = df.apply(EE_general, axis=1, args=tuple(params_best.values()))
X_best = df[['R1p_log', 'taux_250um', 'EE_best_opt']].values
y = df['lambda'].values

# Validation Leave-One-Out avec le modèle calibré
print("\n🔄 Validation croisée Leave-One-Out en cours...")
pred = np.zeros_like(y)
loo = LeaveOneOut()

for tr, ts in loo.split(X_best):
    GP_best_loaded.fit(X_best[tr], y[tr])
    pred[ts] = GP_best_loaded.predict(X_best[ts])

# Calcul des métriques d'évaluation
mae = mean_absolute_error(y, pred)
rmse = np.sqrt(mean_squared_error(y, pred))
r2 = r2_score(y, pred)

print(f"\n📈 Performances du modèle calibré :")
print(f"   MAE  (Erreur absolue moyenne) : {mae:.6f} W/m·K")
print(f"   RMSE (Erreur quadratique)     : {rmse:.6f} W/m·K")
print(f"   R²   (Coefficient de déterm.) : {r2:.4f}")

# Calcul des erreurs individuelles
errors = np.abs(y - pred)
print(f"\n   Erreur max  : {errors.max():.6f} W/m·K")
print(f"   Erreur min  : {errors.min():.6f} W/m·K")
print(f"   Médiane err : {np.median(errors):.6f} W/m·K")

# Visualisation finale : Mesures vs Prédictions
plt.figure(figsize=(10, 10))
plt.scatter(y, pred, color='blue', s=100, alpha=0.7,
            edgecolors='darkblue', linewidth=1.5, label='Prédictions')

# Ligne de prédiction parfaite
lims = [y.min()*0.999, y.max()*1.001]
plt.plot(lims, lims, 'r--', linewidth=2.5, label="Prédiction parfaite (y=x)")

# Zone de tolérance ±0.002 W/m·K
plt.fill_between(lims, [l-0.002 for l in lims], [l+0.002 for l in lims],
                 color='green', alpha=0.2, label='Tolérance ±0.002 W/m·K')

# Annotations
textstr = f'R² = {r2:.4f}\nRMSE = {rmse:.6f} W/m·K\nMAE = {mae:.6f} W/m·K'
props = dict(boxstyle='round', facecolor='wheat', alpha=0.8)
plt.text(0.05, 0.95, textstr, transform=plt.gca().transAxes, fontsize=11,
         verticalalignment='top', bbox=props)

plt.xlabel("Conductivité mesurée (W/m·K)", fontsize=13)
plt.ylabel("Conductivité prédite (W/m·K)", fontsize=13)
plt.title("Validation LOOCV – Modèle GP Calibré", fontsize=15, fontweight='bold')
plt.legend(fontsize=11, loc='lower right')
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('validation_finale_GP_calibre.png', dpi=150)
print("\n✅ Graphique sauvegardé : validation_finale_GP_calibre.png")
plt.close()  # Fermer au lieu de show() pour exécution en arrière-plan


# ============================================================================
# SECTION 6 : EXPORT DU MODÈLE FINAL
# ============================================================================

print("\n" + "=" * 80)
print("SECTION 6 : Export du modèle final")
print("=" * 80)

# Export du modèle final avec nomenclature explicite
final_model_path = 'modele_GP_conductivite_22lots.pkl'
joblib.dump({'GP': GP_best_loaded, 'params': params_best}, final_model_path)

print(f"\n✅ Modèle final exporté : {final_model_path}")
print(f"\n📦 Contenu du modèle :")
print(f"   - GP     : Modèle Gaussian Process entraîné")
print(f"   - params : Dictionnaire des 5 paramètres optimisés")


# ============================================================================
# EXEMPLE D'UTILISATION DU MODÈLE
# ============================================================================

print("\n" + "=" * 80)
print("EXEMPLE D'UTILISATION DU MODÈLE")
print("=" * 80)

print("""
# --- Code pour charger et utiliser le modèle ---

import joblib
import numpy as np

# 1. Charger le modèle
model_data = joblib.load('modele_GP_conductivite_22lots.pkl')
GP_model = model_data['GP']
params = model_data['params']

# 2. Préparer de nouvelles données
# Format attendu : [R1p_log, taux_250um, EE_best_opt]
# où :
#   - R1p_log = -log(taux_250um / (taux_500um + taux_250um))
#   - taux_250um = pourcentage de particules 250µm
#   - EE_best_opt = calculé avec la fonction EE_general() et params

# 3. Faire une prédiction
# prediction = GP_model.predict(X_nouvelles_donnees)

# Exemple avec les premières lignes du jeu de données actuel :
""")

# Démonstration avec les 3 premières lignes
X_demo = X_best[:3]
y_demo_pred = GP_best_loaded.predict(X_demo)
y_demo_real = y[:3]

print("\n📊 Démonstration sur les 3 premiers échantillons :")
print("\n" + "-" * 70)
print(f"{'Échantillon':<12} {'λ Mesurée':<15} {'λ Prédite':<15} {'Erreur':<15}")
print("-" * 70)
for i in range(3):
    error = abs(y_demo_real[i] - y_demo_pred[i])
    print(f"{i+1:<12} {y_demo_real[i]:<15.6f} {y_demo_pred[i]:<15.6f} {error:<15.6f}")
print("-" * 70)

print("\n" + "=" * 80)
print("✅ SCRIPT TERMINÉ AVEC SUCCÈS")
print("=" * 80)
print(f"\nFichiers générés :")
print(f"   1. modele_GP_best.pkl")
print(f"   2. modele_GP_conductivite_22lots.pkl")
print(f"   3. validation_initiale_GP.png")
print(f"   4. calibration_random_search.png")
print(f"   5. validation_finale_GP_calibre.png")
print("\n🎉 Le modèle est prêt à être utilisé pour des prédictions !\n")
