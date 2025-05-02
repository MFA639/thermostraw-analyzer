import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database } from 'lucide-react';
import ImprovedDistributionChart from './components/ImprovedDistributionChart';
import FractionInputForm from './components/FractionInputForm';
import PredictionResult from './components/PredictionResult';
import './App.css';

function App() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fractionData, setFractionData] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // Fonction pour extraire les paramètres de l'URL
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const autoCalc = params.get('auto') === 'true';
    setAutoMode(autoCalc);
    
    const urlParams = {
      taux_2mm: parseFloat(params.get('taux_2mm')),
      taux_1mm: parseFloat(params.get('taux_1mm')),
      taux_500um: parseFloat(params.get('taux_500um')),
      taux_250um: parseFloat(params.get('taux_250um')),
      taux_0: parseFloat(params.get('taux_0'))
    };
    
    // Utiliser les valeurs par défaut si les paramètres sont manquants ou invalides
    if (Object.values(urlParams).some(value => isNaN(value))) {
      return {
        taux_2mm: 15.83,
        taux_1mm: 53.44,
        taux_500um: 20.46,
        taux_250um: 7.26,
        taux_0: 3.01
      };
    }
    
    return urlParams;
  };
  
  // Fonction pour formater les données des fractions pour le graphique
  const formatFractionData = (fractions, optimalRanges) => {
    return [
      { name: '> 2mm', value: fractions.taux_2mm, min: optimalRanges.taux_2mm[0], max: optimalRanges.taux_2mm[1] },
      { name: '1-2mm', value: fractions.taux_1mm, min: optimalRanges.taux_1mm[0], max: optimalRanges.taux_1mm[1] },
      { name: '500μm-1mm', value: fractions.taux_500um, min: optimalRanges.taux_500um[0], max: optimalRanges.taux_500um[1] },
      { name: '250-500μm', value: fractions.taux_250um, min: optimalRanges.taux_250um[0], max: optimalRanges.taux_250um[1] },
      { name: '< 250μm', value: fractions.taux_0, min: optimalRanges.taux_0[0], max: optimalRanges.taux_0[1] }
    ];
  };
  
  // Effectue un calcul automatique au chargement si le mode auto est activé
  useEffect(() => {
    const params = getUrlParams();
    
    // Chargement des données par défaut pour le graphique
    const defaultOptimalRanges = {
      taux_2mm: [12, 18],
      taux_1mm: [53, 58],
      taux_500um: [19, 24],
      taux_250um: [4, 7],
      taux_0: [0, 1]
    };
    
    setFractionData(formatFractionData(params, defaultOptimalRanges));
    
    // Si mode auto, lancer le calcul
    if (autoMode) {
      handleSubmit(params);
    }
  }, []);
  
  const handleSubmit = async (fractions) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/predict`, fractions);
      setPrediction(response.data);
      
      // Mise à jour des données pour le graphique
      setFractionData(formatFractionData(fractions, response.data.optimal_ranges));
    } catch (err) {
      console.error('Erreur de prédiction:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la prédiction. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportCSV = () => {
    window.open(`${API_URL}/export-csv`, '_blank');
  };
  
  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50 text-gray-800">
      {/* En-tête */}
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ThermoStraw Analyzer</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Modèle: GP V4-BEST (EE_best)</span>
            {autoMode && (
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">Mode Auto</span>
            )}
            <button 
              className="bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-500 text-sm flex items-center"
              onClick={handleExportCSV}
            >
              <Database size={16} className="mr-1" /> Exporter CSV
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 p-4 gap-4 overflow-auto">
        {/* Panneau principal - adapté pour le mode auto */}
        <div className={`flex flex-col ${autoMode ? 'w-full' : 'w-2/3'} gap-4`}>
          {/* Résultat de prédiction */}
          {prediction && <PredictionResult prediction={prediction} />}
          
          {/* Graphique de distribution */}
          {fractionData.length > 0 && <ImprovedDistributionChart fractionData={fractionData} />}
          
          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Erreur!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
        </div>
        
        {/* Panneau latéral - caché en mode auto */}
        {!autoMode && (
          <div className="w-1/3 flex flex-col gap-4">
            {/* Formulaire de saisie */}
            <FractionInputForm onSubmit={handleSubmit} isLoading={loading} />
            
            {/* Informations supplémentaires */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-3">Informations</h2>
              <div className="text-sm text-gray-600">
                <p>Cette application utilise le modèle GP V4-BEST avec l'indicateur EE_best pour prédire la conductivité thermique de la paille hachée à partir de sa distribution granulométrique.</p>
                <p className="mt-2">La prédiction est basée sur les paramètres optimisés suivants :</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>k500 = 1.83</li>
                  <li>k250 = 3.04</li>
                  <li>c = 0.196</li>
                  <li>dmax = 1.76%</li>
                  <li>α = 0.572</li>
                </ul>
              </div>
              
              {/* Ajout du graphique de validation */}
              <div className="mt-4 border-t pt-3">
                <h3 className="text-lg font-semibold mb-2">Validation du modèle</h3>
                <img 
                  src="/validation-graph.png" 
                  alt="Graphique de validation GP V4-BEST" 
                  className="w-full rounded-md border border-gray-200"
                />
                <p className="text-xs text-gray-600 mt-1 text-center">
                  Validation du modèle GP V4-BEST: prédiction vs mesures réelles
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;