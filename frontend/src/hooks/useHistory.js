import { useState, useEffect } from 'react';

const STORAGE_KEY = 'retainiq_v1_history';
const MAX_ENTRIES = 100;

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse history, resetting", e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
  });

  // Sync to localstorage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history mapping", e);
    }
  }, [history]);

  const saveEntry = (result, formData) => {
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      probability: result.churn_probability,
      riskLevel: result.risk_level,
      churnPrediction: result.churn_prediction,
      topFeature: result.top_reasons && result.top_reasons[0] ? result.top_reasons[0].feature : 'unknown',
      formSnapshot: { ...formData }
    };
    
    setHistory(prev => {
      const updated = [newEntry, ...prev];
      if (updated.length > MAX_ENTRIES) {
        return updated.slice(0, MAX_ENTRIES);
      }
      return updated;
    });
  };

  const clearHistory = () => setHistory([]);

  const getEntry = (id) => history.find(h => h.id === id);

  return { history, saveEntry, clearHistory, getEntry };
}
