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
      <header className="header retainiq-header">
        <h1>RetainIQ</h1>
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
      
      <main className="main">
        {activeTab === 'single' ? (
          <div className="grid-layout">
            <CustomerForm onPredict={handlePredict} loading={loading} />
            <div className="result-container-flex">
               <ResultCard result={result} error={error} loading={loading} />
            </div>
          </div>
        ) : (
          <BulkUploadView />
        )}
      </main>
    </div>
  )
}
