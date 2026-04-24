import { useState } from 'react'
import CustomerForm from './components/CustomerForm'
import ResultCard from './components/ResultCard'
import BulkUploadView from './components/BulkUploadView'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('single')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePredict = async (formData) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Prediction failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>XGBoost / Churn Predictor</h1>
        <div className="header-tabs">
          <button 
            className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            Single Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            Batch CSV
          </button>
        </div>
      </header>
      
      <main className="main">
        {activeTab === 'single' ? (
          <div className="grid-layout">
            <CustomerForm onPredict={handlePredict} loading={loading} />
            <ResultCard result={result} error={error} loading={loading} />
          </div>
        ) : (
          <BulkUploadView />
        )}
      </main>
    </div>
  )
}
