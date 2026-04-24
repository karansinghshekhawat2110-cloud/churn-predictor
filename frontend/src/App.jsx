import { useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import CustomerForm from './components/CustomerForm'
import ResultCard from './components/ResultCard'
import BulkUploadView from './components/BulkUploadView'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('single')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePredict = async (formData) => {
    setLoading(true)
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
      toast.error(err.message)
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
               <ResultCard result={result} loading={loading} />
            </div>
          </div>
        ) : (
          <BulkUploadView />
        )}
      </main>
    </div>
  )
}
