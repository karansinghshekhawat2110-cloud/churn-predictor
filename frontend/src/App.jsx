import { useState } from 'react'
import CustomerForm from './components/CustomerForm'
import ResultCard from './components/ResultCard'
import './App.css'

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePredict = async (formData) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
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
        <div className="header-icon">⚡</div>
        <div>
          <h1>Churn Predictor</h1>
          <p>IBM Telco · Random Forest · SHAP Explanations</p>
        </div>
      </header>

      <main className="main">
        <CustomerForm onPredict={handlePredict} loading={loading} />
        <ResultCard result={result} error={error} loading={loading} />
      </main>
    </div>
  )
}



