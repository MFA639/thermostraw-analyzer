import React, { useState } from 'react';

const FractionInputForm = ({ onSubmit, isLoading }) => {
  const [fractions, setFractions] = useState({
    taux_2mm: 15.83,
    taux_1mm: 53.44,
    taux_500um: 20.46,
    taux_250um: 7.26,
    taux_0: 3.01
  });

  const [batchNumber, setBatchNumber] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFractions({ ...fractions, [name]: parseFloat(value) || 0 });
  };

  const handleBatchNumberChange = (e) => {
    setBatchNumber(e.target.value);
  };

  const validateInput = () => {
    const total = Object.values(fractions).reduce((sum, val) => sum + val, 0);
    
    if (total < 99 || total > 101) {
      setError(`La somme des fractions doit être proche de 100%. Actuellement: ${total.toFixed(2)}%`);
      return false;
    }
    
    if (!batchNumber.trim()) {
      setError('Le numéro de lot est obligatoire');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateInput()) {
      // Combiner toutes les données à envoyer
      const submissionData = {
        ...fractions,
        batchNumber: batchNumber.trim(),
        timestamp: new Date().toISOString()
      };
      onSubmit(submissionData);
    }
  };

  const getTotal = () => {
    return Object.values(fractions).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Analyse granulométrique</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Champ numéro de lot */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de lot *
          </label>
          <input 
            type="text" 
            value={batchNumber}
            onChange={handleBatchNumberChange}
            placeholder="Ex: LOT-2025-001"
            className="w-full border rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Fractions granulométriques */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-700 mb-3">
            Distribution granulométrique (%)
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">
                {'> 2mm :'}
              </label>
              <input 
                type="number" 
                name="taux_2mm"
                step="0.01"
                min="0"
                max="100"
                value={fractions.taux_2mm}
                onChange={handleChange}
                className="flex-1 border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">
                {'1-2mm :'}
              </label>
              <input 
                type="number" 
                name="taux_1mm"
                step="0.01"
                min="0"
                max="100"
                value={fractions.taux_1mm}
                onChange={handleChange}
                className="flex-1 border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">
                {'500μm-1mm :'}
              </label>
              <input 
                type="number" 
                name="taux_500um"
                step="0.01"
                min="0"
                max="100"
                value={fractions.taux_500um}
                onChange={handleChange}
                className="flex-1 border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">
                {'250-500μm :'}
              </label>
              <input 
                type="number" 
                name="taux_250um"
                step="0.01"
                min="0"
                max="100"
                value={fractions.taux_250um}
                onChange={handleChange}
                className="flex-1 border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">
                {'< 250μm :'}
              </label>
              <input 
                type="number" 
                name="taux_0"
                step="0.01"
                min="0"
                max="100"
                value={fractions.taux_0}
                onChange={handleChange}
                className="flex-1 border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>
        
        {/* Total */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className={`text-sm ${Math.abs(getTotal() - 100) > 1 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            Total: <span className="font-medium">{getTotal().toFixed(2)}%</span>
            {Math.abs(getTotal() - 100) > 1 && (
              <span className="ml-2">⚠ Doit être proche de 100%</span>
            )}
          </div>
        </div>
        
        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        
        {/* Bouton de soumission */}
        <div className="pt-4">
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Prédiction en cours...
              </span>
            ) : (
              'Prédire la conductivité thermique'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FractionInputForm;