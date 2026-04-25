import { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import CustomerForm from './components/CustomerForm'
import ResultCard from './components/ResultCard'
import BulkUploadView from './components/BulkUploadView'
import DashboardView from './components/DashboardView'
import ModelMetricsPanel from './components/ModelMetricsPanel'
import { useHistory } from './hooks/useHistory'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('single')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(null)
  
  const [simulatedResult, setSimulatedResult] = useState(null)
  const [isMetricsPanelOpen, setIsMetricsPanelOpen] = useState(false)
  const [apiWarm, setApiWarm] = useState(false)
  const [modelStats, setModelStats] = useState(null)
  
  const { history, saveEntry, clearHistory } = useHistory()

  useEffect(() => {
    fetch('https://churn-predictor-api-zigm.onrender.com/health')
      .then(r => r.json())
      .then(data => {
        setModelStats(data)
        setApiWarm(true)
      })
      .catch(() => setApiWarm(true))

    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Enter to trigger predict
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const predictBtn = document.querySelector('.predict-btn')
        if (predictBtn && activeTab === 'single') predictBtn.click()
      }
      // Esc to close metrics
      if (e.key === 'Escape') {
        setIsMetricsPanelOpen(false)
      }
      // Tabs
      if ((e.metaKey || e.ctrlKey) && e.key === '1') setActiveTab('single')
      if ((e.metaKey || e.ctrlKey) && e.key === '2') setActiveTab('bulk')
      if ((e.metaKey || e.ctrlKey) && e.key === '3') setActiveTab('dashboard')
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  const handlePredict = async (submitData) => {
    setLoading(true)
    setResult(null)
    setSimulatedResult(null)
    setFormData(submitData)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Prediction failed')
      }

      const data = await response.json()
      setResult(data)
      saveEntry(data, submitData)
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

  const onSimulate = async (modifiedFormData) => {
    try {
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifiedFormData)
      })
      if (response.ok) {
        const data = await response.json()
        setSimulatedResult(data)
      }
    } catch (err) {
      console.warn("Simulator API error:", err)
    }
  }

  const handleReloadEntry = (entry) => {
    setFormData(entry.formSnapshot)
    setResult({
      churn_probability: entry.probability,
      risk_level: entry.riskLevel,
      churn_prediction: entry.churnPrediction,
      top_reasons: [{ feature: entry.topFeature, effect: 0, direction: 'unknown' }] // mock minimal
    })
    setSimulatedResult(null)
    setActiveTab('single')
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span 
                    className={`stat-chip clickable ${isMetricsPanelOpen ? 'active' : ''}`} 
                    onClick={() => setIsMetricsPanelOpen(!isMetricsPanelOpen)}
                  >
                    {modelStats.model}
                  </span>
                  <span 
                    className={`stat-chip clickable ${isMetricsPanelOpen ? 'active' : ''}`}
                    onClick={() => setIsMetricsPanelOpen(!isMetricsPanelOpen)}
                  >
                    ROC-AUC {modelStats.test_roc_auc}
                  </span>
                  <span 
                    className={`stat-chip clickable ${isMetricsPanelOpen ? 'active' : ''}`}
                    onClick={() => setIsMetricsPanelOpen(!isMetricsPanelOpen)}
                  >
                    Threshold {modelStats.threshold}
                  </span>
                </div>
                <span className="shortcut-hint-desktop">
                  ⌘+Enter to predict · ⌘1/2/3 switch tabs
                </span>
              </div>
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
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard {history.length > 0 && `(${history.length})`}
          </button>
        </div>
      </header>

      <ModelMetricsPanel 
        isOpen={isMetricsPanelOpen} 
        onClose={() => setIsMetricsPanelOpen(false)} 
      />
      
      {!apiWarm && (
        <div className="cold-start-banner">
          ⏳ Server waking up...
        </div>
      )}

      <main className="main">
        {activeTab === 'single' && (
          <div className="grid-layout">
            <CustomerForm onPredict={handlePredict} loading={loading} externalData={formData} />
            <div className="result-container-flex">
               <ResultCard 
                 result={result} 
                 loading={loading} 
                 formData={formData} 
                 simulatedResult={simulatedResult} 
                 onSimulate={onSimulate} 
                 testRocAuc={modelStats?.test_roc_auc}
               />
            </div>
          </div>
        )}
        {activeTab === 'bulk' && <BulkUploadView />}
        {activeTab === 'dashboard' && (
          <DashboardView 
            history={history} 
            onClearHistory={clearHistory} 
            onReloadEntry={handleReloadEntry} 
          />
        )}
      </main>
    </div>
  )
}
