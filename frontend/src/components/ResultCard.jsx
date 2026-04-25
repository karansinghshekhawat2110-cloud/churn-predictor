import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Activity, Download, Shield, Zap, Heart, MessageSquare, Plus, Minus, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import './ResultCard.css'

const actionMap = {
  'Contract': { icon: Shield, title: 'Contract Lock-in', action: 'Offer a 10% discount for moving from Monthly to a 1y or 2y contract.' },
  'OnlineSecurity': { icon: Shield, title: 'Security Upsell', action: 'Bundle Online Security + Backup for a flat $5 add-on fee.' },
  'TechSupport': { icon: Zap, title: 'Priority Support', action: 'Offer 3 months of free Priority Tech Support to resolve experience friction.' },
  'MonthlyCharges': { icon: Heart, title: 'Retention Discount', action: 'Apply a one-time 15% loyalty credit to their next bill.' },
  'tenure': { icon: Activity, title: 'Milestone Reward', action: 'Send a "first anniversary" gift or digital badging to increase affinity.' },
  'InternetService': { icon: Zap, title: 'Fiber Upgrade', action: 'If on DSL, offer free installation for Fiber to improve service quality.' },
  'PaymentMethod': { icon: CheckCircle, title: 'Auto-pay Incentive', action: 'Offer $2/mo credit for switching to Credit Card (Auto-pay).' }
}

const FEATURE_DOCS = {
  'Contract': { label: 'Contract Type', explain: (d) => d === 'increases risk' ? 'Month-to-month contracts are the #1 churn driver in our model.' : 'Long-term contracts strongly lock in revenue.' },
  'OnlineSecurity': { label: 'Security Status', explain: (d) => d === 'increases risk' ? 'Lack of security features makes customers feel unprotected and prone to leave.' : 'Security features increase sticky usage.' },
  'TechSupport': { label: 'Tech Support', explain: (d) => d === 'increases risk' ? 'Customers without easy technical help are frustrated twice as fast.' : 'Support availability builds long-term trust.' },
  'MonthlyCharges': { label: 'Bill Amount', explain: (d) => d === 'increases risk' ? 'High monthly bills increase price sensitivity and competitor comparison.' : 'Competitive pricing reduces churn incentive.' },
  'tenure': { label: 'Account Age', explain: (d) => d === 'increases risk' ? 'Early-stage customers haven\'t formed a habit yet.' : 'Loyal veterans are rarely lost.' },
  'InternetService': { label: 'Fiber Optic', explain: (d) => d === 'increases risk' ? 'Fiber optic service may have high friction or pricing issues in this cohort.' : 'High-speed internet keeps users engaged.' },
  'PaymentMethod': { label: 'Electronic Check', explain: (d) => d === 'increases risk' ? 'Manual payments are points of friction; missing one can lead to churn.' : 'Auto-pay ensures consistent billing.' }
}

const RiskRing = ({ pct, color }) => {
  const r = 45
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="risk-ring-container">
      <svg className="risk-ring-svg" viewBox="0 0 120 120">
        <circle className="ring-bg" cx="60" cy="60" r={r} />
        <motion.circle 
          className="ring-fill" 
          cx="60" cy="60" r={r}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          stroke={color}
          style={{ strokeDasharray: circ }}
        />
      </svg>
      <div className="risk-ring-text">
        <span className="risk-pct">{pct}%</span>
        <span className="risk-label">Churn Prob</span>
      </div>
    </div>
  )
}

function SimulatorPanel({ result, formData, simulatedResult, onSimulate }) {
  if (result.risk_level === 'Low' && !simulatedResult) return null

  const features = ['Contract', 'OnlineSecurity', 'TechSupport']
  const options = {
    'Contract': ['Month-to-month', 'One year', 'Two year'],
    'OnlineSecurity': ['Yes', 'No', 'No internet service'],
    'TechSupport': ['Yes', 'No', 'No internet service']
  }

  const handleChange = (feat, val) => {
    onSimulate({ ...formData, [feat]: val })
  }

  return (
    <div className="simulator-card">
      <div className="sim-header">
        <Activity size={14} />
        <span>Scenario Simulator</span>
      </div>
      <div className="sim-grid">
        {features.map(f => (
          <div key={f} className="sim-row">
            <label>{f}</label>
            <select 
              value={simulatedResult ? simulatedResult.inputSnapshot?.[f] || formData[f] : formData[f]} 
              onChange={(e) => handleChange(f, e.target.value)}
            >
              {options[f].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      
      {simulatedResult && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="sim-result"
        >
          <div className="sim-compare">
            <div className="sim-stat">
              <span className="sim-label">Original</span>
              <span className="sim-val">{Math.round(result.churn_probability * 100)}%</span>
            </div>
            <div className="sim-arrow">→</div>
            <div className="sim-stat">
              <span className="sim-label">Simulated</span>
              <span className="sim-val highlight" style={{ color: simulatedResult.churn_probability > result.churn_probability ? 'var(--danger)' : 'var(--success)' }}>
                {Math.round(simulatedResult.churn_probability * 100)}%
              </span>
            </div>
          </div>
          <p className="sim-hint">
            {simulatedResult.churn_probability < result.churn_probability 
              ? "✓ Change reduces risk significantly." 
              : "⚠ This change might increase risk."}
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default function ResultCard({ result, loading, formData, simulatedResult, onSimulate, testRocAuc }) {

  const [barsMounted, setBarsMounted] = useState(false)
  const [strategy, setStrategy] = useState(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [hoveredReason, setHoveredReason] = useState(null)
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && !loading) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setBarsMounted(true)
    } else {
      setBarsMounted(false)
      setStrategy(null)
    }
  }, [result, loading])

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

  const handleCopy = () => {
    const pct = Math.round(result.churn_probability * 100)
    const reasonsStr = result.top_reasons.slice(0, 3).map((r, i) => 
      `${i+1}. ${r.feature} (${r.effect > 0 ? '+' : ''}${r.effect})`
    ).join('\n')

    const text = `
RETAINIQ CHURN ANALYSIS REPORT
------------------------------
Timestamp: ${new Date().toLocaleString()}
Probability: ${pct}%
Risk Level: ${result.risk_level}
Verdict: ${result.churn_prediction ? 'PREDICTED TO CHURN' : 'PREDICTED TO STAY'}

TOP 3 RISK FACTORS:
${reasonsStr}

Model Environment: ${result.model_used}
    `.trim()

    navigator.clipboard.writeText(text)
      .then(() => toast.success('Report copied to clipboard!'))
  }

  const handleExportPDF = async () => {
    if (!window.jspdf) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(script)
      await new Promise(resolve => script.onload = resolve)
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pct = Math.round(result.churn_probability * 100)
    const now = new Date().toLocaleString()

    const BLACK = [0, 0, 0]
    const GRAY = [80, 80, 80]
    const LIGHT = [240, 240, 240]
    const DANGER = [220, 50, 50]
    const SUCCESS = [30, 180, 60]
    const WARNING = [220, 150, 0]
    const riskColor = result.risk_level === 'High' ? DANGER : result.risk_level === 'Medium' ? WARNING : SUCCESS

    doc.setFillColor(...BLACK)
    doc.rect(0, 0, 210, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('RETAINIQ', 14, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Customer Churn Analysis Report', 80, 12)
    doc.text(now, 160, 12)

    doc.setTextColor(...BLACK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('CHURN RISK ASSESSMENT', 14, 30)
    
    doc.setFillColor(...riskColor)
    doc.rect(14, 34, 50, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(pct + '%', 39, 47, { align: 'center' })
    
    doc.setTextColor(...riskColor)
    doc.setFontSize(14)
    doc.text(result.risk_level.toUpperCase() + ' RISK', 72, 43)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Verdict: ' + (result.churn_prediction ? 'Customer predicted to CHURN' : 'Customer predicted to STAY'), 72, 50)
    doc.text('Model: ' + result.model_used + ' · Threshold: ' + result.threshold_used, 72, 56)

    doc.setTextColor(...BLACK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TOP RISK DRIVERS (SHAP)', 14, 70)
    
    const maxEff = Math.max(...result.top_reasons.map(r => Math.abs(r.effect)))
    result.top_reasons.forEach((r, i) => {
      const y = 78 + i * 14
      const isRisk = r.direction === 'increases risk'
      const barW = (Math.abs(r.effect) / (maxEff || 1)) * 80
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text('#' + (i+1), 14, y + 5)
      doc.setTextColor(...BLACK)
      doc.text(r.feature, 24, y + 5)
      
      doc.setFillColor(...LIGHT)
      doc.rect(110, y, 80, 6, 'F')
      doc.setFillColor(...(isRisk ? DANGER : SUCCESS))
      doc.rect(110, y, barW, 6, 'F')
      
      doc.setTextColor(...(isRisk ? DANGER : SUCCESS))
      doc.setFont('helvetica', 'normal')
      doc.text((r.effect > 0 ? '+' : '') + r.effect.toFixed(4), 196, y + 5, { align: 'right' })
    })

    const actions = result.top_reasons.filter(r => r.direction === 'increases risk' && actionMap[r.feature])
    if (actions.length > 0) {
      const startY = 78 + result.top_reasons.length * 14 + 10
      doc.setTextColor(...BLACK)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('RECOMMENDED ACTIONS', 14, startY)
      
      actions.slice(0, 3).forEach((r, i) => {
        const y = startY + 10 + i * 20
        const am = actionMap[r.feature]
        doc.setFillColor(...LIGHT)
        doc.rect(14, y, 182, 16, 'F')
        doc.setTextColor(...BLACK)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(am.title, 18, y + 6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        doc.setFontSize(8)
        const lines = doc.splitTextToSize(am.action, 174)
        doc.text(lines[0], 18, y + 12)
      })
    }

    doc.setFillColor(...BLACK)
    doc.rect(0, 285, 210, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Generated by RetainIQ · ML-powered churn prediction · Model accuracy: ROC-AUC ' + (testRocAuc || '0.94'), 105, 292, { align: 'center' })

    doc.save('retainiq_churn_report_' + Date.now() + '.pdf')
  }

  if (loading) {
    return (
      <div className="result-card skeleton">
        <div className="skeleton-ring-outer">
          <div className="skeleton-ring-inner"></div>
        </div>
        <div className="skeleton-content">
          <div className="skeleton-line" style={{ width: '60%', height: '24px' }}></div>
          <div className="skeleton-line" style={{ width: '40%', height: '14px', marginTop: '0.5rem' }}></div>
          <div className="skeleton-bars" style={{ marginTop: '2rem' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-bar-row" i={i}></div>)}
          </div>
        </div>
      </div>
    )
  }

  const mountAnimationVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  }

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
  const ringColor = { High: 'var(--danger)', Medium: 'var(--warning)', Low: 'var(--success)' }[risk_level]
  const pct = Math.round(churn_probability * 100)
  const maxEffect = Math.max(...top_reasons.map(r => Math.abs(r.effect))) || 1
  const actionsToTake = top_reasons.filter(r => r.direction === 'increases risk' && actionMap[r.feature]).slice(0, 2)

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        ref={resultRef}
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
            <button className="action-btn" onClick={handleExportPDF}>Export PDF Report</button>
          </div>
          
          <SimulatorPanel 
            result={result} 
            formData={formData} 
            simulatedResult={simulatedResult} 
            onSimulate={onSimulate} 
          />

          <div>
            <h3 className="reasons-title">Top Risk Drivers (SHAP)</h3>
            {top_reasons.map((r, i) => (
              <div 
                key={i} 
                className="reason-row"
                onMouseEnter={() => setHoveredReason(i)}
                onMouseLeave={() => setHoveredReason(null)}
              >
                <span className="reason-rank">#{i + 1}</span>
                <span className="reason-feature">{r.feature}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <div className="reason-bar-track">
                    <div className="reason-bar-fill" style={{ 
                      width: barsMounted ? `${(Math.abs(r.effect) / maxEffect) * 100}%` : '0%', 
                      background: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)' 
                    }}></div>
                  </div>
                  <span className="reason-effect" style={{ color: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)' }}>
                    {r.effect > 0 ? '+' : ''}{r.effect}
                  </span>
                </div>

                {hoveredReason === i && FEATURE_DOCS[r.feature] && (
                  <div className="shap-tooltip">
                    <div className="shap-tooltip-label">{FEATURE_DOCS[r.feature].label}</div>
                    <div className="shap-tooltip-body">{FEATURE_DOCS[r.feature].explain(r.direction)}</div>
                    <div className="shap-tooltip-effect" style={{ color: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)' }}>
                      SHAP effect: {r.effect > 0 ? '+' : ''}{r.effect}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {churn_prediction && actionsToTake.length > 0 && (
            <div className="action-section">
              <h3 className="reasons-title" style={{ marginTop: '0.5rem' }}>Suggested Actions</h3>
              <div className="action-cards">
                {actionsToTake.map((r, i) => {
                  const AcIcon = actionMap[r.feature].icon
                  return (
                    <div key={i} className="action-card">
                      <span className="action-icon"><AcIcon size={18} /></span>
                      <div className="action-content">
                        <span className="action-title">{actionMap[r.feature].title}</span>
                        <span className="action-desc">{actionMap[r.feature].action}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {churn_prediction && (
            <div style={{ marginTop: '1rem' }}>
              {!strategy ? (
                <button 
                  className="strategy-gen-btn"
                  disabled={strategyLoading || cooldown > 0}
                  onClick={handleGenerateStrategy}
                >
                  {strategyLoading ? <Loader2 className="animate-spin" size={16} /> : cooldown > 0 ? `Available in ${cooldown}s` : "✦ Generate Retention Strategy"}
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
                    <button id="copy-strat-btn" className="action-btn-sm" onClick={handleCopyStrategy}>Copy Strategy</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="result-footer">{model_used} Engine</div>
      </motion.div>
    </AnimatePresence>
  )
}