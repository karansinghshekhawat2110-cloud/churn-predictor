import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Award, ShieldCheck, Headset, Wifi, DollarSign, CreditCard, Activity } from 'lucide-react'
import './ResultCard.css'

const actionMap = {
  'Contract': {
    title: 'Offer a long-term contract',
    action: 'Customers on month-to-month plans churn 3x more. Offer a discount for switching to annual.',
    icon: ClipboardList
  },
  'tenure': {
    title: 'Loyalty reward program',
    action: 'Low-tenure customers are high risk. A 1-month free credit at month 3 reduces churn by ~18%.',
    icon: Award
  },
  'OnlineSecurity': {
    title: 'Bundle online security',
    action: 'Customers without security add-ons churn more. Offer a free 30-day trial.',
    icon: ShieldCheck
  },
  'TechSupport': {
    title: 'Proactive support outreach',
    action: 'No tech support is a strong churn signal. Trigger a support check-in call.',
    icon: Headset
  },
  'InternetService': {
    title: 'Address fiber service quality',
    action: 'Fiber optic users churn more despite paying more. Issue a satisfaction survey.',
    icon: Wifi
  },
  'MonthlyCharges': {
    title: 'Pricing Optimization',
    action: 'High monthly charges flag cost sensitivity. Check if a tailored down-sell package rescues the account.',
    icon: DollarSign
  },
  'PaymentMethod': {
    title: 'Incentivize Auto-Pay',
    action: 'Manual check users churn 2x more frequently. Offer a $5/mo discount to switch to auto-pay.',
    icon: CreditCard
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
          stroke="var(--surface-2)" strokeWidth="10" />
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

const SimulatorPanel = ({ result, formData, simulatedResult, onSimulate }) => {
  const [simForm, setSimForm] = useState(formData ? { ...formData } : null)

  useEffect(() => {
    if (simForm && JSON.stringify(simForm) !== JSON.stringify(formData)) {
      const t = setTimeout(() => {
        onSimulate({ ...formData, ...simForm })
      }, 400)
      return () => clearTimeout(t)
    }
  }, [simForm, formData, onSimulate])

  if (!result || !result.churn_prediction || !formData) return null

  const simFeatures = result.top_reasons.filter(r => r.direction === 'increases risk')
  if (simFeatures.length === 0) return null

  // Ensure rings correctly compute
  const origPct = Math.round(result.churn_probability * 100)
  const simPct = simulatedResult ? Math.round(simulatedResult.churn_probability * 100) : null
  const diff = simPct !== null ? simPct - origPct : null

  // Render logic bounds
  const getRingColor = (pct) => {
    if (pct === null) return 'var(--muted)'
    if (pct >= 50) return 'var(--danger)'
    if (pct >= 37) return 'var(--warning)'
    return 'var(--success)'
  }

  const handleChange = (e, key, parser) => {
    const val = parser ? parser(e.target.value) : e.target.value
    setSimForm(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border)' }}>
      <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem', fontWeight: 800 }}>
        Intervention Simulator
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'var(--surface-2)', border: '2px solid var(--border)' }}>
        
        {/* Controls Block */}
        {simFeatures.map(f => {
          if (f.feature === 'tenure') {
            return (
              <div key="tenure" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <label>Tenure</label>
                  <span>{simForm.tenure} months</span>
                </div>
                <input 
                  type="range" min="0" max="72" step="1" 
                  value={simForm.tenure} 
                  onChange={e => handleChange(e, 'tenure', parseInt)}
                  className="sim-slider" 
                />
              </div>
            )
          }
          if (f.feature === 'MonthlyCharges') {
            return (
              <div key="monthly" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <label>Monthly Charges</label>
                  <span>${simForm.MonthlyCharges}</span>
                </div>
                <input 
                  type="range" min="18" max="120" step="0.5" 
                  value={simForm.MonthlyCharges} 
                  onChange={e => handleChange(e, 'MonthlyCharges', parseFloat)}
                  className="sim-slider" 
                />
              </div>
            )
          }
          if (f.feature === 'Contract') {
            return (
              <div key="contract" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Contract Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Month-to-month', 'One year', 'Two year'].map(c => (
                    <button 
                      key={c}
                      className={`pill-btn ${simForm.Contract === c ? 'active' : ''}`}
                      onClick={() => setSimForm(prev => ({...prev, Contract: c}))}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '11px', flex: 1 }}
                    >
                      {c.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          return null
        })}

        {/* Results Graph Block */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
             <RiskRing pct={origPct} color={getRingColor(origPct)} />
             <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>CURRENT</span>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} className={simPct === null && JSON.stringify(simForm) !== JSON.stringify(formData) ? 'sim-pulsing' : ''}>
             <RiskRing pct={simPct || origPct} color={simPct ? getRingColor(simPct) : 'var(--border)'} />
             <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em' }}>SIMULATED</span>
           </div>
        </div>
        
        {diff !== null && diff !== 0 && (
          <div style={{ 
            background: diff < 0 ? 'var(--success)' : 'var(--danger)',
            color: diff < 0 ? '#000' : '#fff',
            border: '2px solid var(--border)',
            padding: '0.5rem',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)'
          }}>
            {diff < 0 ? `▼ ${Math.abs(diff)} pts safer` : `▲ ${Math.abs(diff)} pts riskier`}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResultCard({ result, loading, formData, simulatedResult, onSimulate }) {

  const [barsMounted, setBarsMounted] = useState(false)
  const [strategy, setStrategy] = useState(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const t = setInterval(() => setCooldown(v => v - 1), 1000)
      return () => clearInterval(t)
    }
  }, [cooldown])

  // Reset strategy when result changes
  useEffect(() => {
    setStrategy(null)
    setCooldown(0)
  }, [result])

  const handleGenerateStrategy = async () => {
    setStrategyLoading(true)
    try {
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/generate_strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: formData,
          churn_probability: result.churn_probability,
          risk_level: result.risk_level,
          top_reasons: result.top_reasons
        })
      })
      const data = await response.json()
      setStrategy(data.strategy)
      setCooldown(20)
    } catch (err) {
      setStrategy("⚠️ Strategy generation failed. Please check your GROQ_API_KEY.")
    } finally {
      setStrategyLoading(false)
    }
  }

  const handleCopyStrategy = () => {
    if (!strategy) return
    navigator.clipboard.writeText(strategy)
    const btn = document.getElementById('copy-strat-btn')
    const orig = btn.innerText
    btn.innerText = "Copied ✓"
    setTimeout(() => btn.innerText = orig, 2000)
  }

  // Trigger SHAP bars after short mount delay
  useEffect(() => {
    setBarsMounted(false)
    if (result) {
      const t = setTimeout(() => setBarsMounted(true), 50)
      return () => clearTimeout(t)
    }
  }, [result])

  const mountAnimationVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  }

  if (loading) return (
    <div className="result-card center">
      <div className="skeleton-bars">
        <div className="skeleton-bar" style={{ width: '40%', height: '140px', margin: '0 auto', borderRadius: '50%' }}></div>
        <div className="skeleton-bar" style={{ width: '80%' }}></div>
        <div className="skeleton-bar" style={{ width: '60%' }}></div>
      </div>
    </div>
  )

  // Empty State with Lucide Icon mapping
  if (!result) return (
    <motion.div variants={mountAnimationVariants} initial="hidden" animate="visible" className="result-card center">
       <Activity size={56} style={{ color: 'var(--surface-2)', marginBottom: '1rem' }} />
       <p className="empty-label">
         Waiting for pipeline.<br />
         Complete the wizard and analyze.
       </p>
    </motion.div>
  )

  const { churn_probability, churn_prediction, risk_level, model_used, top_reasons } = result

  const handleCopy = () => {
    const pct = Math.round(churn_probability * 100)
    const text = `Churn Prediction Result
Risk: ${risk_level}
Probability: ${pct}%
Verdict: ${churn_prediction ? 'Will Churn' : 'Will Stay'}
Top Reason: ${top_reasons[0]?.feature} (${top_reasons[0]?.direction})
Model: ${model_used}`
    navigator.clipboard.writeText(text)
      .then(() => alert('Result copied to clipboard!'))
  }

  const handlePrint = () => window.print()

  // Mapping RetainIQ SVG colors
  const ringColor = {
    High: 'var(--danger)',   /* #EF4444 */
    Medium: 'var(--warning)', /* #F59E0B */
    Low: 'var(--success)'    /* #22C55E */
  }[risk_level]

  const pct = Math.round(churn_probability * 100)
  
  // Calculate max absolute effect for bar widths
  const maxEffect = Math.max(...top_reasons.map(r => Math.abs(r.effect))) || 1

  // Extract Top actionable drivers
  const actionsToTake = top_reasons
    .filter(r => r.direction === 'increases risk' && actionMap[r.feature])
    .slice(0, 2)

  return (
    <AnimatePresence mode="popLayout">
      <motion.div 
        className="result-card" 
        key={JSON.stringify(result)}
        variants={mountAnimationVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="result-content">
          
          <RiskRing pct={pct} color={ringColor} />

          <div className="result-actions" style={{ marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
            <button className="action-btn" onClick={handleCopy}>Copy Result</button>
            <button className="action-btn" onClick={handlePrint}>Print / Save PDF</button>
          </div>
          
          <SimulatorPanel 
            result={result} 
            formData={formData} 
            simulatedResult={simulatedResult} 
            onSimulate={onSimulate} 
          />

          <div>
            <h3 className="reasons-title">Top Risk Drivers (SHAP)</h3>
            {top_reasons.map((r, i) => {
              const barWidthTarget = `${(Math.abs(r.effect) / maxEffect) * 100}%`
              const barWidth = barsMounted ? barWidthTarget : '0%'
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

          {/* Retention Action Recommendations with Lucide Integration */}
          {churn_prediction && actionsToTake.length > 0 && (
            <motion.div 
              className="action-section"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.25, duration: 0.3}}
            >
              <h3 className="reasons-title" style={{ marginTop: '0.5rem' }}>Suggested Actions</h3>
              <div className="action-cards">
                {actionsToTake.map((r, i) => {
                  const AcIcon = actionMap[r.feature].icon
                  return (
                    <div key={i} className="action-card">
                      <span className="action-icon">
                        <AcIcon size={18} />
                      </span>
                      <div className="action-content">
                        <span className="action-title">{actionMap[r.feature].title}</span>
                        <span className="action-desc">{actionMap[r.feature].action}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {churn_prediction && (
            <div style={{ marginTop: '1rem' }}>
              {!strategy ? (
                <button 
                  className="strategy-gen-btn"
                  disabled={strategyLoading || cooldown > 0}
                  onClick={handleGenerateStrategy}
                >
                  {strategyLoading ? "Generating..." : cooldown > 0 ? `Available in ${cooldown}s` : "✦ Generate Retention Strategy"}
                </button>
              ) : (
                <div className="strategy-box">
                  <div className="strategy-content">
                    {strategy.split('## ').filter(s => s.trim()).map((section, idx) => {
                      const [title, ...content] = section.split('\n');
                      return (
                        <div key={idx} style={{ marginBottom: '1rem' }}>
                          <h5 className="strategy-sec-title">{title.trim()}</h5>
                          <p className="strategy-sec-body">{content.join('\n').trim()}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button id="copy-strat-btn" className="action-btn-sm" onClick={handleCopyStrategy}>
                      Copy Strategy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        <div className="result-footer">
          {model_used} Engine
        </div>
      </motion.div>
    </AnimatePresence>
  )
}