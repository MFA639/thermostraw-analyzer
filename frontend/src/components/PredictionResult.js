import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const PredictionResult = ({ prediction }) => {
  if (!prediction) return null;
  
  const { lambda_predicted, confidence_interval, status } = prediction;
  
  const statusColors = {
    green: 'bg-green-500',
    orange: 'bg-orange-400',
    red: 'bg-red-500'
  };
  
  const statusIcons = {
    green: <CheckCircle className="text-green-500" size={36} />,
    orange: <AlertTriangle className="text-orange-400" size={36} />,
    red: <XCircle className="text-red-500" size={36} />
  };
  
  const statusMessages = {
    green: "Qualité optimale - Production conforme",
    orange: "Attention - Distribution granulométrique hors plages optimales",
    red: "Critique - Test laboratoire requis"
  };
  
  const getSpecificMessages = () => {
    if (status === 'green') {
      return (
        <ul className="space-y-1">
          <li className="flex items-center"><CheckCircle size={16} className="text-green-500 mr-2" /> Distribution granulométrique optimale</li>
          <li className="flex items-center"><CheckCircle size={16} className="text-green-500 mr-2" /> Conductivité thermique conforme</li>
          <li className="flex items-center"><CheckCircle size={16} className="text-green-500 mr-2" /> Particules fines minimisées</li>
        </ul>
      );
    } else if (status === 'orange') {
      return (
        <ul className="space-y-1">
          <li className="flex items-center"><AlertTriangle size={16} className="text-orange-400 mr-2" /> Fractions hors plages optimales</li>
          <li className="flex items-center"><CheckCircle size={16} className="text-green-500 mr-2" /> Conductivité thermique conforme</li>
          <li className="flex items-center"><AlertTriangle size={16} className="text-orange-400 mr-2" /> Ajuster les paramètres de broyage</li>
        </ul>
      );
    } else {
      return (
        <ul className="space-y-1">
          <li className="flex items-center"><XCircle size={16} className="text-red-500 mr-2" /> Test en laboratoire requis</li>
          <li className="flex items-center"><XCircle size={16} className="text-red-500 mr-2" /> Ajuster les paramètres de hachage</li>
          <li className="flex items-center"><XCircle size={16} className="text-red-500 mr-2" /> Vérifier l'état des tamis</li>
        </ul>
      );
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prédiction de conductivité thermique</h2>
        <div className={`px-3 py-1 rounded text-white font-medium flex items-center ${statusColors[status]}`}>
          {status === "green" ? "Conforme" : status === "orange" ? "Attention" : "Critique"}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50">
          <span className="text-sm text-gray-500 mb-1">Conductivité prédite (λ)</span>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">{lambda_predicted.toFixed(4)}</span>
            <span className="ml-1 text-gray-500">W/m·K</span>
          </div>
          <span className="text-xs text-gray-400 mt-1">±{confidence_interval.toFixed(4)} W/m·K (95% IC)</span>
          
          <div className="w-full mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${lambda_predicted <= 0.04 ? 'bg-green-500' : lambda_predicted <= 0.043 ? 'bg-orange-400' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, (lambda_predicted/0.045)*100)}%` }}
            ></div>
          </div>
          <div className="w-full flex justify-between text-xs mt-1">
            <span>0.035</span>
            <span className="text-green-600">0.040</span>
            <span className="text-orange-500">0.043</span>
            <span>0.045</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-center p-6 border rounded-lg">
          <div className="flex items-center mb-4">
            {statusIcons[status]}
            <div className="ml-3">
              <h3 className={`font-medium ${status === "green" ? "text-green-600" : status === "orange" ? "text-orange-500" : "text-red-600"}`}>
                {status === "green" ? "QUALITÉ OPTIMALE" : status === "orange" ? "ATTENTION" : "CRITIQUE"}
              </h3>
              <p className="text-sm text-gray-600">{statusMessages[status]}</p>
            </div>
          </div>
          
          <div className="text-sm">
            {getSpecificMessages()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionResult;