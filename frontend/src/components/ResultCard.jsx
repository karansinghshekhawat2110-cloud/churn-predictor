import './ResultCard.css'

export default function ResultCard({ result, error, loading }) {

  if (loading) return (
    <div className="result-card center">
      <div className="skeleton-bars">
        <div className="skeleton-bar" style={{ width: '60%' }}></div>
        <div className="skeleton-bar" style={{ width: '40%' }}></div>
        <div className="skeleton-bar" style={{ width: '80%' }}></div>
      </div>
    </div>
  )

  if (error) return (
    <div className="result-card center">
      <p className="empty-label" style={{ color: 'var(--danger)' }}>{error}</p>
    </div>
  )

  if (!result) return (
    <div className="result-card center">
      <p className="empty-label">
        No prediction yet.<br />
        Complete the form and click Predict Churn.
      </p>
    </div>
  )

  const { churn_probability, churn_prediction, risk_level, model_used, threshold_used, top_reasons } = result

  const badgeStyles = {
    High: { background: 'rgba(218,54,51,0.12)', color: '#f47067', border: '1px solid rgba(218,54,51,0.25)' },
    Medium: { background: 'rgba(176,140,26,0.12)', color: '#d4a72c', border: '1px solid rgba(176,140,26,0.25)' },
    Low: { background: 'rgba(46,160,67,0.12)', color: '#3fb950', border: '1px solid rgba(46,160,67,0.25)' }
  }[risk_level]

  const gaugeColor = {
    High: 'var(--danger)',
    Medium: 'var(--warning)',
    Low: 'var(--success)'
  }[risk_level]

  const pct = Math.round(churn_probability * 100)
  
  // Calculate max absolute effect for bar widths
  const maxEffect = Math.max(...top_reasons.map(r => Math.abs(r.effect))) || 1

  return (
    <div className="result-card">
      <div className="result-content">
        
        {/* Subtle photo marker based on prediction */}
        <div className={`result-photo-marker ${churn_prediction ? 'churned' : 'stayed'}`}></div>

        <div className="risk-badge" style={badgeStyles}>
          {risk_level} Risk
        </div>

        <div>
          <div className="gauge-label">
            <span>Churn Probability</span>
            <span className="gauge-pct">{pct}%</span>
          </div>
          <div className="gauge-track">
            <div className="gauge-fill" style={{ width: `${pct}%`, background: gaugeColor }}></div>
          </div>
          <div className="gauge-meta">
            Threshold: {Math.round(threshold_used * 100)}% · {churn_prediction ? 'Will Churn' : 'Will Stay'}
          </div>
        </div>

        <div className="verdict-row">
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Prediction</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: churn_prediction ? 'var(--danger)' : 'var(--success)' }}>
            {churn_prediction ? 'WILL CHURN' : 'WILL STAY'}
          </span>
        </div>

        <div>
          <h3 className="reasons-title">Top Reasons</h3>
          {top_reasons.map((r, i) => {
            const barWidth = `${(Math.abs(r.effect) / maxEffect) * 100}%`
            const isRiskInc = r.direction === 'increases risk'
            return (
              <div key={i} className="reason-row">
                <span className="reason-rank">#{i + 1}</span>
                <span className="reason-feature">{r.feature}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <div className="reason-bar-track">
                    <div className="reason-bar-fill" style={{ 
                      width: barWidth, 
                      background: isRiskInc ? 'var(--danger)' : 'var(--success)' 
                    }}></div>
                  </div>
                  <span className="reason-effect" style={{ color: isRiskInc ? 'var(--danger)' : 'var(--success)' }}>
                    {r.effect > 0 ? '+' : ''}{r.effect}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
      <div className="result-footer">
        {model_used}
      </div>
    </div>
  )
}