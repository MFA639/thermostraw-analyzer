import React, { useState } from 'react';
import { Copy, Check, Calendar, Beaker, BarChart3, TrendingUp } from 'lucide-react';

const PredictionSummary = ({ prediction, inputData }) => {
  const [copied, setCopied] = useState(false);
  
  // Formater la date et l'heure
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Déterminer le statut et la couleur
  const getStatusInfo = (status) => {
    switch (status) {
      case 'green':
        return { text: 'Conforme', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'orange':
        return { text: 'Attention', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'red':
        return { text: 'Non conforme', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      default:
        return { text: 'Inconnu', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const statusInfo = getStatusInfo(prediction.status);

  // Créer le texte à copier
  const createCopyText = () => {
    const text = `RAPPORT D'ANALYSE THERMOSTRAW ANALYZER
    
═══════════════════════════════════════

INFORMATIONS GÉNÉRALES
- Numéro de lot : ${inputData.batchNumber}
- Date et heure : ${formatDateTime(inputData.timestamp)}
- Modèle utilisé : GP V4-BEST avec indicateur EE_best

DISTRIBUTION GRANULOMÉTRIQUE
- > 2mm : ${inputData.taux_2mm.toFixed(2)}%
- 1-2mm : ${inputData.taux_1mm.toFixed(2)}%
- 500μm-1mm : ${inputData.taux_500um.toFixed(2)}%
- 250-500μm : ${inputData.taux_250um.toFixed(2)}%
- < 250μm : ${inputData.taux_0.toFixed(2)}%
- Total : ${Object.values(inputData).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0).toFixed(2)}%

RÉSULTATS DE PRÉDICTION
- Conductivité thermique prédite : ${prediction.lambda_predicted.toFixed(4)} W/m·K
- Incertitude (95% IC) : ±${prediction.confidence_interval.toFixed(4)} W/m·K
- Statut : ${statusInfo.text}

PARAMÈTRES DU MODÈLE
- k500 = 1.83
- k250 = 3.04
- c = 0.196
- dmax = 1.76%
- α = 0.572

═══════════════════════════════════════

Rapport généré automatiquement par ThermoStraw Analyzer
Modèle GP V4-BEST - Validation disponible dans l'interface`;

    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie :', err);
      // Solution de secours pour les navigateurs sans prise en charge du clipboard
      const textArea = document.createElement('textarea');
      textArea.value = createCopyText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Résumé de l'analyse
        </h2>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Informations générales */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 flex items-center">
            <Calendar className="mr-2" size={16} />
            Informations générales
          </h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Numéro de lot :</span>
              <span className="font-medium">{inputData.batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date et heure :</span>
              <span className="font-medium">{formatDateTime(inputData.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Modèle utilisé :</span>
              <span className="font-medium">GP V4-BEST</span>
            </div>
          </div>
        </div>

        {/* Distribution granulométrique */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700">Distribution granulométrique</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{"> 2mm :"}</span>
              <span className="font-medium">{inputData.taux_2mm.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"1-2mm :"}</span>
              <span className="font-medium">{inputData.taux_1mm.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"500μm-1mm :"}</span>
              <span className="font-medium">{inputData.taux_500um.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"250-500μm :"}</span>
              <span className="font-medium">{inputData.taux_250um.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"< 250μm :"}</span>
              <span className="font-medium">{inputData.taux_0.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Résultats de prédiction */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 flex items-center">
            <TrendingUp className="mr-2" size={16} />
            Résultats de prédiction
          </h3>
          <div className={`p-4 rounded-lg border ${statusInfo.bg} ${statusInfo.border}`}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Conductivité thermique :</span>
                <span className="text-xl font-bold text-gray-800">
                  {prediction.lambda_predicted.toFixed(4)} W/m·K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Incertitude (95% IC) :</span>
                <span className="font-medium text-sm">±{prediction.confidence_interval.toFixed(4)} W/m·K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Statut :</span>
                <span className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informations sur le modèle */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 flex items-center">
            <Beaker className="mr-2" size={16} />
            Paramètres du modèle
          </h3>
          <div className="text-sm bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <span>k500 = 1.83</span>
              <span>k250 = 3.04</span>
              <span>c = 0.196</span>
              <span>dmax = 1.76%</span>
              <span>α = 0.572</span>
            </div>
          </div>
        </div>

        {/* Bouton de copie */}
        <div className="border-t pt-4">
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {copied ? (
              <>
                <Check className="mr-2" size={16} />
                Copié dans le presse-papiers !
              </>
            ) : (
              <>
                <Copy className="mr-2" size={16} />
                Copier le résumé complet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionSummary;