import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Database } from 'lucide-react';
import html2canvas from 'html2canvas';
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
  const chartRef = useRef(null);
  
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
  
  // Fonction pour capturer le graphique en tant qu'image
  const captureChart = useCallback(async () => {
    console.log('Début de la capture du graphique...');
    
    if (!chartRef.current) {
      console.error('Référence au graphique non trouvée');
      return null;
    }
    
    try {
      // S'assurer que le graphique est visible et rendu
      const chartElement = chartRef.current;
      console.log('Dimensions du graphique:', chartElement.offsetWidth, 'x', chartElement.offsetHeight);
      
      // Capture initiale avec une bonne qualité
      const canvas = await html2canvas(chartElement, {
        scale: 2, // Bonne qualité initiale
        backgroundColor: '#ffffff',
        logging: true,
        useCORS: true,
        allowTaint: true
      });
      
      // Vérification et redimensionnement si nécessaire
      const maxPixels = 900000; // Marge de sécurité (< 1 million)
      const currentPixels = canvas.width * canvas.height;
      console.log(`Taille de l'image capturée: ${canvas.width}x${canvas.height} = ${currentPixels} pixels`);
      
      let finalCanvas = canvas;
      
      if (currentPixels > maxPixels) {
        console.log('Image trop grande, redimensionnement nécessaire...');
        
        // Calculer le facteur de réduction nécessaire
        const scaleFactor = Math.sqrt(maxPixels / currentPixels);
        
        // Créer un nouveau canvas redimensionné
        const resizedCanvas = document.createElement('canvas');
        const newWidth = Math.floor(canvas.width * scaleFactor);
        const newHeight = Math.floor(canvas.height * scaleFactor);
        
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        finalCanvas = resizedCanvas;
        console.log(`Image redimensionnée à ${newWidth}x${newHeight} = ${newWidth * newHeight} pixels`);
      }
      
      // Conversion en JPEG avec compression pour réduire davantage la taille
      const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.8); // 80% de qualité JPEG
      console.log('Image capturée, taille des données:', dataUrl.length);
      
      // Vérifier que l'image est valide
      if (dataUrl.length < 100) {
        console.error('Image capturée trop petite, probablement invalide');
        return null;
      }
      
      return dataUrl;
    } catch (err) {
      console.error('Erreur lors de la capture du graphique:', err);
      return null;
    }
  }, []);
  
  // Fonction pour envoyer l'image au backend
  const sendChartImage = useCallback(async (fractions, chartImage) => {
    console.log('Envoi de l\'image au backend...');
    
    try {
      // Vérifier que l'image est valide
      if (!chartImage || chartImage.length < 100) {
        console.error('Image invalide, annulation de l\'envoi');
        return null;
      }
      
      const response = await axios.post(`${API_URL}/save-chart-image`, {
        fractions,
        chart_image: chartImage
      });
      
      console.log('Réponse du backend:', response.data);
      return response.data;
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'image:', err);
      return null;
    }
  }, [API_URL]);
  
  // Effectue un calcul automatique au chargement si le mode auto est activé
  useEffect(() => {
    const params = getUrlParams();
    console.log('Mode auto:', autoMode);
    console.log('Paramètres URL:', params);
    
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
      console.log('Lancement du calcul automatique...');
      handleSubmit(params);
    }
  }, [autoMode]);
  
  const handleSubmit = async (fractions) => {
    setLoading(true);
    setError('');
    console.log('Soumission des fractions:', fractions);
    
    try {
      const response = await axios.post(`${API_URL}/predict`, fractions);
      console.log('Réponse de prédiction reçue:', response.data);
      
      setPrediction(response.data);
      
      // Mise à jour des données pour le graphique
      setFractionData(formatFractionData(fractions, response.data.optimal_ranges));
      
      // Si en mode auto, capturer et envoyer l'image après rendu du graphique
      if (autoMode) {
        console.log('Mode auto détecté, préparation pour la capture d\'image...');
        
        // Attendre que le graphique soit rendu complètement
        // Augmenter le délai pour s'assurer que Recharts a terminé le rendu
        setTimeout(async () => {
          console.log('Tentative de capture du graphique après délai...');
          const chartImage = await captureChart();
          
          if (chartImage) {
            console.log('Image capturée avec succès, envoi au backend...');
            const result = await sendChartImage(fractions, chartImage);
            
            if (result) {
              console.log('Image envoyée avec succès au backend');
              // Optionnel: Ajouter un indicateur visuel de succès
              console.log('Image stockée avec la clé:', result.key);
            } else {
              console.error('Échec de l\'envoi de l\'image au backend');
            }
          } else {
            console.error('Échec de la capture de l\'image');
          }
        }, 2000); // Augmenté à 2 secondes pour garantir le rendu complet
      }
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
          
          {/* Graphique de distribution avec référence pour la capture */}
          <div ref={chartRef} style={{ backgroundColor: 'white' }}>
            {fractionData.length > 0 && <ImprovedDistributionChart fractionData={fractionData} />}
          </div>
          
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