import { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import CustomerForm from './components/CustomerForm'
import ResultCard from './components/ResultCard'
import BulkUploadView from './components/BulkUploadView'
import PredictionHistory from './components/PredictionHistory'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('single')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [apiWarm, setApiWarm] = useState(false)
  const [modelStats, setModelStats] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetch('https://churn-predictor-api-zigm.onrender.com/health')
      .then(r => r.json())
      .then(data => {
        setModelStats(data)
        setApiWarm(true)
      })
      .catch(() => setApiWarm(true))
  }, [])

  const handlePredict = async (formData) => {
    setLoading(true)
    setResult(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Prediction failed')
      }

      const data = await response.json()
      setResult(data)
      setHistory(prev => [{...data, timestamp: new Date().toLocaleTimeString()}, ...prev].slice(0, 5))
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        toast.error('Request timed out. The server may be waking up — please try again in a moment.')
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }
        }}
      />
      
      <header className="header retainiq-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>RetainIQ</h1>
          <div className="header-right">
            {modelStats ? (
              <>
                <span className="stat-chip">{modelStats.model}</span>
                <span className="stat-chip">ROC-AUC {modelStats.test_roc_auc}</span>
                <span className="stat-chip">Threshold {modelStats.threshold}</span>
              </>
            ) : (
              <span className="stat-chip muted">Loading model info...</span>
            )}
          </div>
        </div>
        <div className="header-tabs">
          <button 
            className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            Prediction Engine
          </button>
          <button 
            className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            Batch Analysis
          </button>
        </div>
      </header>
      
      {!apiWarm && (
        <div className="cold-start-banner">
          ⏳ Server is waking up — first prediction may take 30–60 seconds on free tier.
        </div>
      )}

      <main className="main">
        {activeTab === 'single' ? (
          <>
            <div className="grid-layout">
              <CustomerForm onPredict={handlePredict} loading={loading} />
              <div className="result-container-flex">
                 <ResultCard result={result} loading={loading} />
              </div>
            </div>
            <PredictionHistory history={history} />
          </>
        ) : (
          <BulkUploadView />
        )}
      </main>
    </div>
  )
}
