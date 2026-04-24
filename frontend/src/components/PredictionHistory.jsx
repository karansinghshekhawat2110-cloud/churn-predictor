import './PredictionHistory.css'

export default function PredictionHistory({ history }) {
  if (!history.length) return null

  return (
    <div className="history-section">
      <h3 className="history-title">Recent Predictions</h3>
      <div className="history-list">
        {history.map((item, i) => {
          const pct = Math.round(item.churn_probability * 100)
          const riskColor = { Low: 'var(--success)', Medium: 'var(--warning)', High: 'var(--danger)' }[item.risk_level]
          return (
            <div key={i} className="history-row">
              <span className="history-time">{item.timestamp}</span>
              <span className="history-verdict" style={{ color: item.churn_prediction ? 'var(--danger)' : 'var(--success)' }}>
                {item.churn_prediction ? 'Will Churn' : 'Will Stay'}
              </span>
              <span className="history-risk" style={{ color: riskColor }}>{item.risk_level} Risk</span>
              <span className="history-pct">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
