import { useState, useEffect } from 'react'
import './ResultCard.css'

const actionMap = {
  'Contract': {
    title: 'Offer a long-term contract',
    action: 'Customers on month-to-month plans churn 3x more. Offer a discount for switching to annual.'
  },
  'tenure': {
    title: 'Loyalty reward program',
    action: 'Low-tenure customers are high risk. A 1-month free credit at month 3 reduces churn by ~18%.'
  },
  'OnlineSecurity': {
    title: 'Bundle online security',
    action: 'Customers without security add-ons churn more. Offer a free 30-day trial.'
  },
  'TechSupport': {
    title: 'Proactive support outreach',
    action: 'No tech support is a strong churn signal. Trigger a support check-in call.'
  },
  'InternetService': {
    title: 'Address fiber service quality',
    action: 'Fiber optic users churn more despite paying more — often a satisfaction issue. Send a survey.'
  },
  'MonthlyCharges': {
    title: 'Pricing Optimization',
    action: 'High monthly charges flag cost sensitivity. Check if a tailored down-sell package rescues the account.'
  },
  'PaymentMethod': {
    title: 'Incentivize Auto-Pay',
    action: 'Manual check users churn 2x more frequently. Offer a $5/mo discount to switch to credit-card auto-pay.'
  }
}

// Animated Risk Score Ring Component
const RiskRing = ({ pct, color }) => {
  const r = 54, circ = 2 * Math.PI * r
  const [anim, setAnim] = useState(0)
  
  useEffect(() => {
    const t = setTimeout(() => setAnim(pct), 80)
    return () => clearTimeout(t)
  }, [pct])
  
  const offset = circ - (anim / 100) * circ
  
  return (
    <div className="ring-container">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none"
          stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <text x="70" y="74" textAnchor="middle"
          fontSize="22" fontWeight="700"
          fontFamily="var(--font-mono)"
          fill={color}>{pct}%</text>
        <text x="70" y="92" textAnchor="middle"
          fontSize="11" fill="var(--muted)" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">Risk</text>
      </svg>
    </div>
  )
}

export default function ResultCard({ result, error, loading }) {

  if (loading) return (
    <div className="result-card center">
      <div className="skeleton-bars">
        <div className="skeleton-bar" style={{ width: '40%', height: '140px', margin: '0 auto', borderRadius: '50%' }}></div>
        <div className="skeleton-bar" style={{ width: '80%' }}></div>
        <div className="skeleton-bar" style={{ width: '60%' }}></div>
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
        Waiting for pipeline.<br />
        Complete the wizard and analyze.
      </p>
    </div>
  )

  const { churn_probability, churn_prediction, risk_level, model_used, top_reasons } = result

  // Mapping RetainIQ SVG colors
  const ringColor = {
    High: 'var(--danger)',   /* #EF4444 */
    Medium: 'var(--warning)', /* #F59E0B */
    Low: 'var(--success)'    /* #22C55E */
  }[risk_level]

  const pct = Math.round(churn_probability * 100)
  
  // Calculate max absolute effect for bar widths
  const maxEffect = Math.max(...top_reasons.map(r => Math.abs(r.effect))) || 1

  // Extract Top 2 actionable drivers
  const actionsToTake = top_reasons
    .filter(r => r.direction === 'increases risk' && actionMap[r.feature])
    .slice(0, 2);

  return (
    <div className="result-card">
      <div className="result-content">
        
        <RiskRing pct={pct} color={ringColor} />

        <div>
          <h3 className="reasons-title">Top Risk Drivers (SHAP)</h3>
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

        {/* Retention Action Recommendations */}
        {churn_prediction && actionsToTake.length > 0 && (
          <div className="action-section">
            <h3 className="reasons-title" style={{ marginTop: '0.5rem' }}>Suggested Actions</h3>
            <div className="action-cards">
              {actionsToTake.map((r, i) => (
                <div key={i} className="action-card">
                  <span className="action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </span>
                  <div className="action-content">
                    <span className="action-title">{actionMap[r.feature].title}</span>
                    <span className="action-desc">{actionMap[r.feature].action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <div className="result-footer">
        {model_used} Engine
      </div>
    </div>
  )
}