import React, { useState } from 'react';

const FractionInputForm = ({ onSubmit, isLoading }) => {
  const [fractions, setFractions] = useState({
    taux_2mm: 15.83,
    taux_1mm: 53.44,
    taux_500um: 20.46,
    taux_250um: 7.26,
    taux_0: 3.01
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFractions({ ...fractions, [name]: parseFloat(value) || 0 });
  };

  const validateFractions = () => {
    const total = Object.values(fractions).reduce((sum, val) => sum + val, 0);
    
    if (total < 99 || total > 101) {
      setError(`La somme des fractions doit être proche de 100%. Actuellement: ${total.toFixed(2)}%`);
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateFractions()) {
      onSubmit(fractions);
    }
  };

  const getTotal = () => {
    return Object.values(fractions).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Mesures granulométriques</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {'> 2mm'}
            </label>
            <input 
              type="number" 
              name="taux_2mm"
              step="0.01"
              min="0"
              max="100"
              value={fractions.taux_2mm}
              onChange={handleChange}
              className="border rounded p-2 text-sm"
              required
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {'1-2mm'}
            </label>
            <input 
              type="number" 
              name="taux_1mm"
              step="0.01"
              min="0"
              max="100"
              value={fractions.taux_1mm}
              onChange={handleChange}
              className="border rounded p-2 text-sm"
              required
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {'500μm-1mm'}
            </label>
            <input 
              type="number" 
              name="taux_500um"
              step="0.01"
              min="0"
              max="100"
              value={fractions.taux_500um}
              onChange={handleChange}
              className="border rounded p-2 text-sm"
              required
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {'250-500μm'}
            </label>
            <input 
              type="number" 
              name="taux_250um"
              step="0.01"
              min="0"
              max="100"
              value={fractions.taux_250um}
              onChange={handleChange}
              className="border rounded p-2 text-sm"
              required
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {'< 250μm'}
            </label>
            <input 
              type="number" 
              name="taux_0"
              step="0.01"
              min="0"
              max="100"
              value={fractions.taux_0}
              onChange={handleChange}
              className="border rounded p-2 text-sm"
              required
            />
          </div>
          
          <div className="flex items-end">
            <div className={`text-sm ${Math.abs(getTotal() - 100) > 1 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
              Total: <span className="font-medium">{getTotal().toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? 'Prédiction en cours...' : 'Prédire la conductivité'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FractionInputForm;