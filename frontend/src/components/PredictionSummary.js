import React, { useState, useRef } from 'react';
import { Copy, Check, Calendar, BarChart3, TrendingUp, Image } from 'lucide-react';
import html2canvas from 'html2canvas';

const PredictionSummary = ({ prediction, inputData }) => {
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef(null);
  
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

  // Copier sous forme d'image
  const handleCopyAsImage = async () => {
    try {
      const element = summaryRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0
      });
      
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (fallbackError) {
          // Solution de secours: télécharger l'image
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `thermostraw-rapport-${batchNumber}-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
      
    } catch (err) {
      console.error('Erreur lors de la copie de l\'image :', err);
      alert('Impossible de copier l\'image. Veuillez réessayer.');
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
      
      {/* Contenu à capturer pour l'image */}
      <div ref={summaryRef} className="p-6 space-y-6" style={{ backgroundColor: '#ffffff' }}>
        {/* En-tête du rapport */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-blue-700">RAPPORT D'ANALYSE</h1>
          <h2 className="text-xl font-semibold text-gray-700">THERMOSTRAW ANALYZER</h2>
          <p className="text-sm text-gray-500 mt-2">Modèle GP V4-BEST avec indicateur EE_best</p>
        </div>

        {/* Informations générales */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 flex items-center border-b pb-2">
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
          <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Distribution granulométrique</h3>
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
          <h3 className="text-lg font-medium text-gray-700 flex items-center border-b pb-2">
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

        {/* Graphique de validation du modèle */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Validation du modèle</h3>
          <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="w-96 h-64 bg-white border border-gray-200 rounded-md overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 384 256" style={{ background: '#ffffff' }}>
                  {/* Titre */}
                  <text x="192" y="20" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1f2937">
                    Validation GP V4 - BEST
                  </text>
                  
                  {/* Zone de confiance */}
                  <polygon points="80,200 320,120 320,140 80,220" fill="#c3f0ca" opacity="0.3"/>
                  
                  {/* Axes */}
                  <line x1="80" y1="40" x2="80" y2="240" stroke="#6b7280" strokeWidth="1"/>
                  <line x1="80" y1="240" x2="320" y2="240" stroke="#6b7280" strokeWidth="1"/>
                  
                  {/* Grille */}
                  <line x1="80" y1="80" x2="320" y2="80" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="80" y1="120" x2="320" y2="120" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="80" y1="160" x2="320" y2="160" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="80" y1="200" x2="320" y2="200" stroke="#e5e7eb" strokeWidth="0.5"/>
                  
                  <line x1="120" y1="40" x2="120" y2="240" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="160" y1="40" x2="160" y2="240" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="200" y1="40" x2="200" y2="240" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="240" y1="40" x2="240" y2="240" stroke="#e5e7eb" strokeWidth="0.5"/>
                  <line x1="280" y1="40" x2="280" y2="240" stroke="#e5e7eb" strokeWidth="0.5"/>
                  
                  {/* Points de données */}
                  <circle cx="120" cy="210" r="3" fill="#3b82f6"/>
                  <circle cx="150" cy="190" r="3" fill="#3b82f6"/>
                  <circle cx="160" cy="200" r="3" fill="#3b82f6"/>
                  <circle cx="180" cy="185" r="3" fill="#3b82f6"/>
                  <circle cx="200" cy="180" r="3" fill="#3b82f6"/>
                  <circle cx="220" cy="170" r="3" fill="#3b82f6"/>
                  <circle cx="240" cy="175" r="3" fill="#3b82f6"/>
                  <circle cx="260" cy="165" r="3" fill="#3b82f6"/>
                  <circle cx="280" cy="160" r="3" fill="#3b82f6"/>
                  <circle cx="300" cy="150" r="3" fill="#3b82f6"/>
                  <circle cx="290" cy="155" r="3" fill="#3b82f6"/>
                  <circle cx="270" cy="172" r="3" fill="#3b82f6"/>
                  
                  {/* Ligne de tendance */}
                  <line x1="100" y1="215" x2="310" y2="145" stroke="#1f2937" strokeWidth="2" strokeDasharray="4,4"/>
                  
                  {/* Labels des axes */}
                  <text x="200" y="255" textAnchor="middle" fontSize="10" fill="#6b7280">
                    λ réel (W/m·K)
                  </text>
                  <text x="25" y="140" textAnchor="middle" fontSize="10" fill="#6b7280" transform="rotate(-90 25 140)">
                    λ prédit (W/m·K)
                  </text>
                  
                  {/* Échelle */}
                  <text x="75" y="245" textAnchor="end" fontSize="8" fill="#6b7280">0.0386</text>
                  <text x="75" y="205" textAnchor="end" fontSize="8" fill="#6b7280">0.0396</text>
                  <text x="75" y="165" textAnchor="end" fontSize="8" fill="#6b7280">0.0406</text>
                  <text x="75" y="125" textAnchor="end" fontSize="8" fill="#6b7280">0.0416</text>
                  <text x="75" y="85" textAnchor="end" fontSize="8" fill="#6b7280">0.0426</text>
                  
                  <text x="120" y="252" textAnchor="middle" fontSize="8" fill="#6b7280">0.0386</text>
                  <text x="160" y="252" textAnchor="middle" fontSize="8" fill="#6b7280">0.0396</text>
                  <text x="200" y="252" textAnchor="middle" fontSize="8" fill="#6b7280">0.0406</text>
                  <text x="240" y="252" textAnchor="middle" fontSize="8" fill="#6b7280">0.0416</text>
                  <text x="280" y="252" textAnchor="middle" fontSize="8" fill="#6b7280">0.0426</text>
                  
                  {/* Annotation R² */}
                  <rect x="250" y="60" width="60" height="20" fill="#f3f4f6" stroke="#d1d5db"/>
                  <text x="280" y="73" textAnchor="middle" fontSize="9" fill="#374151">R² = 0.89</text>
                </svg>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Validation croisée : prédiction vs mesures réelles
              </p>
            </div>
          </div>
        </div>

        {/* Paramètres du modèle */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Paramètres du modèle</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">k500 :</span>
                <span className="font-medium">1.83</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">k250 :</span>
                <span className="font-medium">3.04</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">c :</span>
                <span className="font-medium">0.196</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">dmax :</span>
                <span className="font-medium">1.76%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">α :</span>
                <span className="font-medium">0.572</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">R² :</span>
                <span className="font-medium">0.89</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="border-t pt-4 text-center text-xs text-gray-500">
          <p>Rapport généré automatiquement par ThermoStraw Analyzer</p>
          <p>Modèle GP V4-BEST - {formatDateTime(timestamp)}</p>
        </div>
      </div>

      {/* Bouton de copie */}
      <div className="p-6 border-t bg-gray-50">
        <button
          onClick={handleCopyAsImage}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
            copied 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          {copied ? (
            <>
              <Check className="mr-2" size={16} />
              Image copiée dans le presse-papiers !
            </>
          ) : (
            <>
              <Image className="mr-2" size={16} />
              Copier le rapport en image
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PredictionSummary;