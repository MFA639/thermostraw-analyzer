"""
Crée un modèle compatible directement avec les paramètres optimisés connus
"""
import pandas as pd
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
import joblib

# Chargement des données
print("📊 Chargement des données...")
df = pd.read_excel("dataset/datasetConductivite.xlsx")

# Nettoyage des noms de colonnes (comme dans Scriptmodelisation.py)
df.columns = [
    c.strip()
    .replace("µm", "um")
    .replace(" ", "_")
    .replace(">", "taux_")
    .replace("<", "taux_0_")
    for c in df.columns
]

# Renommage pour uniformiser
df.rename(columns={
    "taux_2mm(%)": "taux_2mm",
    "taux_1mm(%)": "taux_1mm",
    "taux_500_um(%)": "taux_500um",
    "taux_250_um(%)": "taux_250um",
    "taux_0_250_um(%)": "taux_0",
    "Conductivité_Codem_(W/m.K)": "lambda",
    'taux__2mm(%)': 'taux_2mm',
    'taux__1mm(%)': 'taux_1mm',
    'taux__500_um(%)': 'taux_500um',
    'taux__250_um(%)': 'taux_250um',
    'taux_0__250_um(%)': 'taux_0'
}, inplace=True)

# Sélection des colonnes pertinentes
df = df[['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0', 'lambda']]

print(f"✅ {len(df)} échantillons chargés")

# Paramètres optimisés (issus de la calibration précédente)
params_best = {
    'k500': 1.5104,
    'k250': 7.9803,
    'c': 0.0705,
    'dmax': 1.6430,
    'alpha': 0.4469
}

print(f"\n🎯 Paramètres optimisés :")
for k, v in params_best.items():
    print(f"   {k:6s} = {v:.4f}")

# Définition des caractéristiques
ASPECT = {'taux_2mm': 12, 'taux_1mm': 10, 'taux_500um': 8, 'taux_250um': 5, 'taux_0': 3}
SIZE = {'taux_2mm': 2.0, 'taux_1mm': 1.0, 'taux_500um': 0.5, 'taux_250um': 0.25, 'taux_0': 0.125}

def calculate_EE_best_opt(row):
    """Calcule EE_best avec les paramètres optimisés"""
    fractions = ['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0']

    # Nombre effectif de particules
    n = {}
    for f in fractions:
        n[f] = row[f] / (SIZE[f]**2 * ASPECT[f])

    # Pondérations
    n['taux_500um'] /= params_best['k500']
    n['taux_250um'] /= params_best['k250']

    # Normalisation
    tot = sum(n.values())
    n = {f: v/tot for f, v in n.items()}

    # Connectivité
    conn = sum(n[f] * (ASPECT[f] - 1) for f in n)

    # Pénalité poussières
    dust = min(row['taux_0'] + params_best['c'] * row['taux_250um'], params_best['dmax']) / 100
    penalty = np.exp(-3 * dust)**params_best['alpha']

    return conn * penalty

def calculate_R1p_log(row):
    """Calcule R1p_log"""
    R1p = row['taux_250um'] / (row['taux_500um'] + row['taux_250um'] + 1e-10)
    return -np.log(R1p + 1e-10)

# Calcul des variables dérivées
print("\n📐 Calcul des variables dérivées...")
df['R1p_log'] = df.apply(calculate_R1p_log, axis=1)
df['EE_best_opt'] = df.apply(calculate_EE_best_opt, axis=1)

# Préparation des données d'entraînement
X_train = df[['R1p_log', 'taux_250um', 'EE_best_opt']].values
y_train = df['lambda'].values

print(f"✅ X_train shape: {X_train.shape}")
print(f"✅ y_train shape: {y_train.shape}")

# Entraînement du modèle Gaussian Process
print("\n🔧 Entraînement du modèle Gaussian Process...")
kernel = RBF(length_scale=1.0) + WhiteKernel(noise_level=0.01)
GP_model = GaussianProcessRegressor(
    kernel=kernel,
    n_restarts_optimizer=10,
    normalize_y=True,
    random_state=42
)

GP_model.fit(X_train, y_train)
print("✅ Modèle entraîné")

# Sauvegarde du modèle
model_data = {
    'GP': GP_model,
    'params': params_best
}

output_file = 'backend/models/modele_GP_conductivite_22lots.pkl'
joblib.dump(model_data, output_file)
print(f"\n💾 Modèle sauvegardé : {output_file}")

# Test rapide
y_pred = GP_model.predict(X_train)
rmse = np.sqrt(np.mean((y_train - y_pred)**2))
print(f"\n📊 RMSE sur les données d'entraînement : {rmse:.6f} W/m·K")
print("✅ Création du modèle terminée!")
