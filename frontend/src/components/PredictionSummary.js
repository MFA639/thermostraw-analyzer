import React, { useState } from 'react';
import { Copy, Check, Calendar, Beaker, BarChart3, TrendingUp } from 'lucide-react';

const PredictionSummary = ({ prediction, inputData }) => {
  const [copied, setCopied] = useState(false);
  
  // Vérifications de sécurité
  if (!prediction || !inputData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Aucune prédiction disponible</p>
      </div>
    );
  }

  // Formater la date et l'heure avec gestion d'erreur
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return new Date().toLocaleString('fr-FR');
    }
  };

  // Déterminer le statut et la couleur avec valeur par défaut
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

  // Valeurs par défaut pour éviter les erreurs
  const lambda_predicted = prediction.lambda_predicted || 0;
  const confidence_interval = prediction.confidence_interval || 0;
  const batchNumber = inputData.batchNumber || 'Non spécifié';
  const timestamp = inputData.timestamp || new Date().toISOString();

  // Créer le texte à copier avec gestion d'erreur
  const createCopyText = () => {
    try {
      const fractionValues = {
        taux_2mm: inputData.taux_2mm || 0,
        taux_1mm: inputData.taux_1mm || 0,
        taux_500um: inputData.taux_500um || 0,
        taux_250um: inputData.taux_250um || 0,
        taux_0: inputData.taux_0 || 0
      };

      const total = Object.values(fractionValues).reduce((sum, val) => sum + val, 0);

      const text = `RAPPORT D'ANALYSE THERMOSTRAW ANALYZER
      
═══════════════════════════════════════

INFORMATIONS GÉNÉRALES
- Numéro de lot : ${batchNumber}
- Date et heure : ${formatDateTime(timestamp)}
- Modèle utilisé : GP V4-BEST avec indicateur EE_best

DISTRIBUTION GRANULOMÉTRIQUE
- > 2mm : ${fractionValues.taux_2mm.toFixed(2)}%
- 1-2mm : ${fractionValues.taux_1mm.toFixed(2)}%
- 500μm-1mm : ${fractionValues.taux_500um.toFixed(2)}%
- 250-500μm : ${fractionValues.taux_250um.toFixed(2)}%
- < 250μm : ${fractionValues.taux_0.toFixed(2)}%
- Total : ${total.toFixed(2)}%

RÉSULTATS DE PRÉDICTION
- Conductivité thermique prédite : ${lambda_predicted.toFixed(4)} W/m·K
- Incertitude (95% IC) : ±${confidence_interval.toFixed(4)} W/m·K
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
    } catch (error) {
      console.error('Erreur lors de la création du texte à copier:', error);
      return 'Erreur lors de la génération du rapport';
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie :', err);
      // Solution de secours
      try {
        const textArea = document.createElement('textarea');
        textArea.value = createCopyText();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        alert('Impossible de copier automatiquement. Veuillez sélectionner et copier le texte manuellement.');
      }
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
              <span className="font-medium">{batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date et heure :</span>
              <span className="font-medium">{formatDateTime(timestamp)}</span>
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
              <span className="font-medium">{(inputData.taux_2mm || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"1-2mm :"}</span>
              <span className="font-medium">{(inputData.taux_1mm || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"500μm-1mm :"}</span>
              <span className="font-medium">{(inputData.taux_500um || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"250-500μm :"}</span>
              <span className="font-medium">{(inputData.taux_250um || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{"< 250μm :"}</span>
              <span className="font-medium">{(inputData.taux_0 || 0).toFixed(2)}%</span>
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
                  {lambda_predicted.toFixed(4)} W/m·K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Incertitude (95% IC) :</span>
                <span className="font-medium text-sm">±{confidence_interval.toFixed(4)} W/m·K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Statut :</span>
                <span className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</span>
              </div>
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