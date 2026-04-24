import './ResultCard.css'

export default function ResultCard({ result, error, loading }) {

  if (loading) return (
    <div className="result-card center">
      <div className="spinner" />
      <h2 className="form-title" style={{color: 'var(--primary)', marginBottom: 0}}>Crunching Numbers... 🧮</h2>
      <p className="muted">The AI is looking into its crystal ball! 🔮</p>
    </div>
  )

  if (error) return (
    <div className="result-card center">
      <div className="error-icon">😱</div>
      <p className="error-text">Oops! {error}</p>
    </div>
  )

  if (!result) return (
    <div className="result-card center">
      <div className="placeholder-icon">🚀</div>
      <h2 className="form-title" style={{color: 'var(--primary)', marginBottom: 0}}>Ready for Liftoff!</h2>
      <p className="muted">Fill out the form and hit predict to see what happens!</p>
    </div>
  )

  const { churn_probability, churn_prediction, risk_level, model_used, threshold_used, top_reasons } = result

  // Color mapping based on risk
  const riskColor = {
    Low: 'var(--success)',
    Medium: 'var(--warning)',
    High: 'var(--danger)'
  }[risk_level]
  
  const riskBg = {
    Low: 'var(--success-light)',
    Medium: 'var(--warning-light)',
    High: 'var(--danger-light)'
  }[risk_level]

  const pct = Math.round(churn_probability * 100)

  return (
    <div className="result-card">
      <div className={`result-hero ${churn_prediction ? 'churn' : 'stay'}`}>
        <div className="result-hero-overlay"></div>
      </div>
      
      <div className="result-content">
        
        {/* Probability Gauge Box */}
        <div className="gauge-container">
          <div className="circular-gauge" style={{ background: `conic-gradient(${riskColor} ${pct}%, #e2e8f0 0)` }}>
            <span className="gauge-pct" style={{ color: riskColor }}>{pct}%</span>
          </div>
        </div>

        <div className={`verdict-box ${churn_prediction ? 'churn' : 'stay'}`}>
          {churn_prediction ? '🚨 ALARM: WILL CHURN! 📉' : '🎉 YAY: WILL STAY! 📈'}
        </div>

        {/* SHAP Reasons */}
        <div className="reasons-section">
          <h3 className="reasons-title">Top Secret Reasons 🕵️‍♀️</h3>
          {top_reasons.map((r, i) => {
            const isUp = r.direction === 'increases risk'
            return (
              <div key={i} className="reason-row">
                <div className="reason-left">
                  <span className="reason-rank">{i + 1}</span>
                  <span className="reason-feature">{r.feature}</span>
                </div>
                <div className="reason-right">
                  <span className={`reason-effect ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '🔥 Adds Risk' : '🛡️ Saves Risk'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div className="result-footer">
        Powered by {model_used} • Threshold: {Math.round(threshold_used * 100)}%
      </div>
      
    </div>
  )
}