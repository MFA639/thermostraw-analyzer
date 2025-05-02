import numpy as np

def calculate_EE_best(taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0):
    """
    Calcule l'indicateur d'enchevêtrement amélioré (EE_best) avec les paramètres optimisés
    
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
    float
        Valeur de l'indicateur EE_best
    """
    # Paramètres optimisés issus de la recherche
    k500 = 1.83
    k250 = 3.04
    c = 0.196
    dmax = 1.76
    alpha = 0.572
    
    # Définition des caractéristiques des fractions
    ASPECT = {'taux_2mm': 12, 'taux_1mm': 10, 'taux_500um': 8, 'taux_250um': 5, 'taux_0': 3}
    SIZE = {'taux_2mm': 2, 'taux_1mm': 1, 'taux_500um': 0.5, 'taux_250um': 0.25, 'taux_0': 0.125}
    
    # Calcul du nombre relatif de particules
    n = {}
    fractions = ['taux_2mm', 'taux_1mm', 'taux_500um', 'taux_250um', 'taux_0']
    values = [taux_2mm, taux_1mm, taux_500um, taux_250um, taux_0]
    
    for i, f in enumerate(fractions):
        n[f] = values[i] / (SIZE[f]**2 * ASPECT[f])
    
    # Application des facteurs de correction
    n['taux_500um'] /= k500
    n['taux_250um'] /= k250
    
    # Normalisation
    tot = sum(n.values())
    n = {f: v/tot for f, v in n.items()}
    
    # Calcul de la connectivité du réseau
    conn = sum(n[f] * (ASPECT[f] - 1) for f in n)
    
    # Calcul de la pénalité liée aux poussières
    dust = min(taux_0 + c * taux_250um, dmax) / 100
    penalty = np.exp(-3 * dust)**alpha
    
    # Indicateur final
    return conn * penalty

def calculate_R1p_log(taux_500um, taux_250um):
    """
    Calcule l'indicateur R1p_log à partir des fractions granulométriques
    
    Paramètres:
    -----------
    taux_500um : float
        Pourcentage de particules entre 500 μm et 1 mm
    taux_250um : float
        Pourcentage de particules entre 250 et 500 μm
        
    Retourne:
    ---------
    float
        Valeur de l'indicateur R1p_log
    """
    # Calcul de R1p
    R1p = taux_250um / (taux_500um + taux_250um + 1e-10)  # Ajout d'une petite valeur pour éviter division par zéro
    
    # Calcul de R1p_log
    R1p_log = -np.log(R1p + 1e-10)
    
    return R1p_log