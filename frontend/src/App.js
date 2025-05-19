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
    console.log('=== DÉBUT DE LA PRÉDICTION ===');
    console.log('Données reçues:', data);
    
    setLoading(true);
    setError('');
    setPrediction(null); // Reset previous prediction
    setInputData(data); // Sauvegarder les données saisies
    
    try {
      // Extraire seulement les fractions pour l'API
      const fractions = {
        taux_2mm: parseFloat(data.taux_2mm) || 0,
        taux_1mm: parseFloat(data.taux_1mm) || 0,
        taux_500um: parseFloat(data.taux_500um) || 0,
        taux_250um: parseFloat(data.taux_250um) || 0,
        taux_0: parseFloat(data.taux_0) || 0
      };
      
      console.log('Fractions envoyées à l\'API:', fractions);
      console.log('URL de l\'API:', `${API_URL}/predict-image`);
      
      const response = await axios.post(`${API_URL}/predict-image`, fractions);
      console.log('Réponse reçue:', response.data);
      
      // Vérifier que la réponse contient les données attendues
      if (!response.data || typeof response.data.lambda_predicted === 'undefined') {
        throw new Error('Réponse invalide du serveur: données manquantes');
      }
      
      setPrediction(response.data);
      console.log('=== PRÉDICTION RÉUSSIE ===');
      
    } catch (err) {
      console.error('=== ERREUR DE PRÉDICTION ===');
      console.error('Erreur complète:', err);
      console.error('Réponse du serveur:', err.response?.data);
      console.error('Statut HTTP:', err.response?.status);
      
      let errorMessage = 'Erreur inconnue lors de la prédiction';
      
      if (err.response) {
        // Erreur HTTP du serveur
        errorMessage = `Erreur serveur (${err.response.status}): ${err.response.data?.detail || err.response.statusText}`;
      } else if (err.request) {
        // Pas de réponse du serveur
        errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
      } else {
        // Autre erreur
        errorMessage = err.message || 'Erreur lors de la préparation de la requête';
      }
      
      setError(errorMessage);
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
                <div className="text-sm mt-1">{error}</div>
              </div>
            )}
            
            {/* Indicateur de chargement */}
            {loading && (
              <div className="mt-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Prédiction en cours...
                </div>
              </div>
            )}
          </div>
          
          {/* Résumé de prédiction */}
          <div>
            {prediction && inputData && !loading && (
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
              <div className="text-center">
                <div className="w-full h-48 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Graphique de validation du modèle</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Validation du modèle GP V4-BEST: prédiction vs mesures réelles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;