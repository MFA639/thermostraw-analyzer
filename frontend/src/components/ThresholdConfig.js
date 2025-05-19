import React, { useState } from 'react';
import { Settings, X, Lock, Check, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ThresholdConfig = ({ currentThreshold, onThresholdUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('pin'); // 'pin' ou 'config'
  const [pin, setPin] = useState('');
  const [newThreshold, setNewThreshold] = useState(currentThreshold || 0.045);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleOpenModal = () => {
    setIsOpen(true);
    setStep('pin');
    setPin('');
    setError('');
    setSuccess(false);
    setNewThreshold(currentThreshold || 0.045);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setStep('pin');
    setPin('');
    setError('');
    setSuccess(false);
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('Le PIN doit contenir 4 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Vérifier le PIN
      const response = await axios.post(`${API_URL}/verify-pin`, { pin });
      if (response.data.valid) {
        setStep('config');
      } else {
        setError('PIN incorrect');
      }
    } catch (err) {
      setError('Erreur de vérification du PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdSubmit = async (e) => {
    e.preventDefault();
    if (newThreshold <= 0 || newThreshold > 0.1) {
      setError('Le seuil doit être entre 0.001 et 0.1 W/m·K');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/update-threshold`, {
        pin,
        threshold: newThreshold
      });
      
      if (response.data.success) {
        setSuccess(true);
        onThresholdUpdate(newThreshold);
        setTimeout(() => {
          handleCloseModal();
        }, 2000);
      } else {
        setError('Erreur lors de la mise à jour du seuil');
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour du seuil');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  const handleThresholdChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setNewThreshold(value);
    }
  };

  return (
    <>
      {/* Bouton de configuration */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Configurer le seuil de conformité"
      >
        <Settings size={24} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            {/* En-tête */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Lock className="mr-2" size={20} />
                Configuration du seuil
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenu selon l'étape */}
            {step === 'pin' ? (
              /* Étape 1: Saisie du PIN */
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saisissez le PIN de sécurité
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={4}
                    autoFocus
                    pattern="\d{4}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PIN à 4 chiffres requis
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Vérification...' : 'Vérifier'}
                </button>
              </form>
            ) : (
              /* Étape 2: Configuration du seuil */
              <div>
                {success ? (
                  <div className="text-center py-8">
                    <Check className="mx-auto text-green-500 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-green-700 mb-2">
                      Seuil mis à jour !
                    </h3>
                    <p className="text-gray-600">
                      Nouveau seuil : {newThreshold.toFixed(3)} W/m·K
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleThresholdSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seuil de conformité (W/m·K)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="0.1"
                        value={newThreshold}
                        onChange={handleThresholdChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Valeur actuelle : {(currentThreshold || 0.045).toFixed(3)} W/m·K
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                      <div className="flex">
                        <AlertTriangle className="text-yellow-400 mr-2 mt-0.5" size={16} />
                        <div className="text-sm text-yellow-700">
                          <p className="font-medium mb-1">Attention</p>
                          <p>La modification du seuil affectera toutes les prédictions futures.</p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setStep('pin')}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Retour
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Mise à jour...' : 'Confirmer'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ThresholdConfig;