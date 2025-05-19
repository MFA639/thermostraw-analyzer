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

  // Valeurs par défaut pour éviter les erreurs
  const lambda_predicted = prediction.lambda_predicted || 0;
  const confidence_interval = prediction.confidence_interval || 0;
  const batchNumber = inputData.batchNumber || 'Non spécifié';
  const timestamp = inputData.timestamp || new Date().toISOString();
  
  // Récupérer le seuil depuis la réponse du backend si disponible
  const threshold = prediction.threshold || 0.045;
  
  // Déterminer le statut depuis la réponse du backend ou par défaut
  const backendStatus = prediction.status;
  let isConforme, statusInfo;
  
  if (backendStatus === 'conforme' || (backendStatus !== 'non_conforme' && lambda_predicted <= threshold)) {
    isConforme = true;
    statusInfo = { text: 'Conforme', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  } else {
    isConforme = false;
    statusInfo = { text: 'Non conforme', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  }

  // L'incertitude est déjà calculée à 90% IC dans le backend
  const confidence_interval_90 = confidence_interval;

  // Copier sous forme d'image
  const handleCopyAsImage = async () => {
    try {
      const element = summaryRef.current;
      
      // Attendre que toutes les images soient chargées
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      // Petit délai pour s'assurer que le rendering est terminé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true
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
      <div ref={summaryRef} className="p-6 bg-white space-y-6" style={{ backgroundColor: '#ffffff', maxWidth: '800px' }}>
        {/* En-tête du rapport */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-blue-700">RAPPORT D'ANALYSE</h1>
          <h2 className="text-xl font-semibold text-gray-700">THERMOSTRAW ANALYZER</h2>
          <p className="text-sm text-gray-500 mt-2">Modèle GP V4-BEST avec indicateur EE_best</p>
        </div>

        {/* Contenu principal en deux colonnes */}
        <div className="grid grid-cols-2 gap-6">
          {/* Colonne gauche */}
          <div className="space-y-6">
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Seuil de conformité :</span>
                  <span className="font-medium">{threshold.toFixed(3)} W/m·K</span>
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
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            {/* Résultats de prédiction */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 flex items-center border-b pb-2">
                <TrendingUp className="mr-2" size={16} />
                Résultats de prédiction
              </h3>
              <div className={`p-4 rounded-lg border ${statusInfo.bg} ${statusInfo.border}`}>
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-gray-700 font-medium">Conductivité thermique :</span>
                    <div className="text-2xl font-bold text-gray-800 mt-1">
                      {lambda_predicted.toFixed(4)} W/m·K
                    </div>
                  </div>
                  {confidence_interval > 0 && (
                    <div className="text-center">
                      <span className="text-gray-600 text-sm">Incertitude (90% IC) :</span>
                      <div className="font-medium text-sm">±{confidence_interval_90.toFixed(4)} W/m·K</div>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="text-gray-600">Statut :</span>
                    <div className={`font-bold ${statusInfo.color} text-lg`}>{statusInfo.text}</div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {isConforme 
                      ? `✓ Valeur inférieure au seuil de ${threshold.toFixed(3)} W/m·K`
                      : `✗ Valeur supérieure au seuil de ${threshold.toFixed(3)} W/m·K`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique de validation du modèle */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Validation du modèle</h3>
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="bg-white border border-gray-200 rounded-md overflow-hidden inline-block">
                    <img 
                      src="/validation-graph.png" 
                      alt="Graphique de validation du modèle GP V4-BEST"
                      className="max-w-full h-auto"
                      style={{ maxHeight: '200px', maxWidth: '300px' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div 
                      style={{ display: 'none' }}
                      className="w-72 h-48 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center text-gray-500 text-sm"
                    >
                      Graphique de validation non disponible
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Validation croisée : prédiction vs mesures réelles
                  </p>
                </div>
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