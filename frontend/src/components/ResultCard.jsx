import './ResultCard.css'

export default function ResultCard({ result, error, loading }) {

  if (loading) return (
    <div className="result-card center">
      <div className="spinner" />
      <p className="muted">Running prediction...</p>
    </div>
  )

  if (error) return (
    <div className="result-card center">
      <div className="error-icon">⚠️</div>
      <p className="error-text">{error}</p>
    </div>
  )

  if (!result) return (
    <div className="result-card center">
      <div className="placeholder-icon">🎯</div>
      <p className="muted">Fill in the customer profile and click Predict Churn</p>
    </div>
  )

  const { churn_probability, churn_prediction, risk_level, model_used, threshold_used, top_reasons } = result

  const riskColor = {
    Low: 'var(--success)',
    Medium: 'var(--warning)',
    High: 'var(--danger)'
  }[risk_level]

  const pct = Math.round(churn_probability * 100)

  return (
    <div className="result-card">

      {/* Risk Badge */}
      <div className="risk-badge" style={{ background: riskColor + '22', border: `1px solid ${riskColor}` }}>
        <span className="risk-dot" style={{ background: riskColor }} />
        <span style={{ color: riskColor, fontWeight: 700 }}>{risk_level} Risk</span>
      </div>

      {/* Probability Gauge */}
      <div className="gauge-section">
        <div className="gauge-label">
          <span>Churn Probability</span>
          <span className="gauge-pct" style={{ color: riskColor }}>{pct}%</span>
        </div>
        <div className="gauge-track">
          <div className="gauge-fill" style={{ width: `${pct}%`, background: riskColor }} />
        </div>
        <div className="gauge-meta">
          Threshold: {Math.round(threshold_used * 100)}% · 
          Prediction: <strong style={{ color: churn_prediction ? 'var(--danger)' : 'var(--success)' }}>
            {churn_prediction ? ' Will Churn' : ' Will Stay'}
          </strong>
        </div>
      </div>

      {/* SHAP Reasons */}
      <div className="reasons-section">
        <h3 className="reasons-title">Top Reasons</h3>
        {top_reasons.map((r, i) => (
          <div key={i} className="reason-row">
            <div className="reason-left">
              <span className="reason-rank">#{i + 1}</span>
              <span className="reason-feature">{r.feature}</span>
            </div>
            <div className="reason-right">
              <span className="reason-dir" style={{
                color: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)'
              }}>
                {r.direction === 'increases risk' ? '↑' : '↓'} {r.direction}
              </span>
              <span className="reason-effect">SHAP: {r.effect}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="result-footer">
        Model: {model_used}
      </div>

    </div>
  )
}