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
        <div className="header-brand">
          <div className="header-icon">✨</div>
          <div>
            <h1>Churn Predictor App</h1>
            <p>Powered by XGBoost & SHAP Magic 🪄</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-badge">🎯 AI-Powered</div>
          <div className="stat-badge">⚡ Real-time Insights</div>
        </div>
      </header>

      <main className="main">
        <div className="photo-hero">
          <div className="photo-hero-bg"></div>
          <div className="photo-hero-overlay"></div>
          <h2>Analyze Customer Happiness & Predict Retention! 🚀</h2>
        </div>

        <CustomerForm onPredict={handlePredict} loading={loading} />
        <ResultCard result={result} error={error} loading={loading} />
      </main>
    </div>
  )
}
