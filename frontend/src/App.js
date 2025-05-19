import React, { useState } from 'react';
import axios from 'axios';
import FractionInputForm from './components/FractionInputForm';
import PredictionSummary from './components/PredictionSummary';
import './App.css';

function App() {
  const [prediction, setPrediction] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  const handleSubmit = async (data) => {
    setLoading(true);
    setError('');
    setInputData(data); // Sauvegarder les données saisies
    
    console.log('Soumission des données:', data);
    
    try {
      // Extraire seulement les fractions pour l'API
      const fractions = {
        taux_2mm: data.taux_2mm,
        taux_1mm: data.taux_1mm,
        taux_500um: data.taux_500um,
        taux_250um: data.taux_250um,
        taux_0: data.taux_0
      };
      
      const response = await axios.post(`${API_URL}/predict-image`, fractions);
      console.log('Réponse de prédiction reçue:', response.data);
      
      setPrediction(response.data);
    } catch (err) {
      console.error('Erreur de prédiction:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la prédiction. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">ThermoStraw Analyzer</h1>
          <p className="text-sm opacity-90">Modèle GP V4-BEST avec indicateur EE_best</p>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire de saisie */}
          <div>
            <FractionInputForm onSubmit={handleSubmit} isLoading={loading} />
            
            {/* Message d'erreur */}
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong className="font-bold">Erreur!</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}
          </div>
          
          {/* Résumé de prédiction */}
          <div>
            {prediction && inputData && (
              <PredictionSummary 
                prediction={prediction} 
                inputData={inputData}
              />
            )}
          </div>
        </div>
        
        {/* Section d'information sur le modèle */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">À propos du modèle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-sm text-gray-600">
              <p className="mb-3">
                Cette application utilise le modèle GP V4-BEST avec l'indicateur EE_best 
                pour prédire la conductivité thermique de la paille hachée à partir de sa 
                distribution granulométrique.
              </p>
              <p className="mb-2 font-medium">Paramètres optimisés :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>k500 = 1.83</li>
                <li>k250 = 3.04</li>
                <li>c = 0.196</li>
                <li>dmax = 1.76%</li>
                <li>α = 0.572</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Validation du modèle</h3>
              <img 
                src="/validation-graph.png" 
                alt="Graphique de validation GP V4-BEST" 
                className="w-full rounded-md border border-gray-200"
              />
              <p className="text-xs text-gray-600 mt-2 text-center">
                Validation du modèle GP V4-BEST: prédiction vs mesures réelles
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;