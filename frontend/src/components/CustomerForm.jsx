import { useState, useMemo, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import './CustomerForm.css'

const defaultForm = {
  gender: 'Male',
  SeniorCitizen: 0,
  Partner: 'Yes',
  Dependents: 'No',
  tenure: 12,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'Fiber optic',
  OnlineSecurity: 'No',
  OnlineBackup: 'No',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'Yes',
  StreamingMovies: 'Yes',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Electronic check',
  MonthlyCharges: 85.5
}

function getLiveScore(form) {
  let score = 0
  // High-weight factors (from SHAP analysis)
  if (form.Contract === 'Month-to-month') score += 3
  if (parseInt(form.tenure) < 12) score += 2.5
  if (parseFloat(form.MonthlyCharges) > 75) score += 1.5
  // Medium-weight factors
  if (form.PaymentMethod === 'Electronic check') score += 1
  if (form.InternetService === 'Fiber optic') score += 0.8
  if (form.OnlineSecurity === 'No') score += 0.8
  if (form.TechSupport === 'No') score += 0.7
  // Low-weight factors
  if (form.OnlineBackup === 'No') score += 0.3
  if (form.DeviceProtection === 'No') score += 0.3
  if (form.SeniorCitizen === 1 || form.SeniorCitizen === '1') score += 0.4
  if (form.Partner === 'No') score += 0.3
  if (form.Dependents === 'No') score += 0.3
  return Math.min(score, 10)
}

function scoreToRisk(score) {
  if (score >= 6) return { level: 'High', color: 'var(--danger)', approxPct: Math.round(50 + score * 5) }
  if (score >= 3.5) return { level: 'Medium', color: 'var(--warning)', approxPct: Math.round(25 + score * 5) }
  return { level: 'Low', color: 'var(--success)', approxPct: Math.round(score * 5) }
}

// Subcomponents
const YesNoToggle = ({ label, value, onChange, riskTag }) => (
  <div className="toggle-group">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <label>{label}</label>
      {riskTag && <span className="risk-tag-inline">{riskTag}</span>}
    </div>
    <button 
      type="button" 
      className={`toggle-track ${value === 'Yes' || value == 1 ? 'active' : ''}`}
      aria-label={`${label}: ${value}`}
      aria-pressed={value === 'Yes' || value == 1}
      onClick={() => onChange(value === 'Yes' ? 'No' : (value == 1 ? 0 : (value === 'No' ? 'Yes' : 1)))}
    >
      <div className="toggle-thumb" />
    </button>
  </div>
)

const PillSelector = ({ label, options, value, onChange, riskMap = {}, firstRef }) => (
  <div className="pill-group">
    <label>{label}</label>
    <div className="pill-container">
      {options.map((opt, i) => (
        <button
          key={opt}
          ref={i === 0 ? firstRef : null}
          type="button"
          className={`pill-btn ${value === opt ? 'active' : ''}`}
          aria-label={`${label}: ${opt}`}
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
        >
          {opt}
          {riskMap[opt] && <span className="risk-badge-mini">{riskMap[opt]}</span>}
        </button>
      ))}
    </div>
  </div>
)

export default function CustomerForm({ onPredict, loading, externalData }) {
  const [form, setForm] = useState(defaultForm)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const firstInputRef = useRef(null)

  // External data hook (from History/Simulator)
  useEffect(() => {
    if (externalData) {
      setForm(externalData)
    }
  }, [externalData])

  useEffect(() => {
    // Focus first element on step change
    firstInputRef.current?.focus()
  }, [step])

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(prev => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }

  const liveScore = useMemo(() => getLiveScore(form), [form])
  const liveRisk = useMemo(() => scoreToRisk(liveScore), [liveScore])

  const handleReset = () => {
    setForm(defaultForm)
    setStep(1)
    setErrors({})
  }

  const validateStep = () => {
    if (step === 2) {
      const newErrors = {}
      const tenureValue = parseInt(form.tenure)
      const mcValue = parseFloat(form.MonthlyCharges)

      if (isNaN(tenureValue) || tenureValue < 0 || tenureValue > 72) {
        newErrors.tenure = 'Tenure must be 0-72 months'
      }
      if (isNaN(mcValue) || mcValue <= 0) {
        newErrors.MonthlyCharges = 'Charges must be greater than 0'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      setStep(s => Math.min(3, s + 1))
    }
  }

  const handleSubmit = () => {
    if (!validateStep()) return

    onPredict({
      ...form,
      SeniorCitizen: parseInt(form.SeniorCitizen),
      tenure: parseInt(form.tenure),
      MonthlyCharges: parseFloat(form.MonthlyCharges)
    })
  }

  // Calculate progress bar line width
  const progressWidth = step === 1 ? 0 : step === 2 ? 50 : 100

  return (
    <div className="form-card">
      
      <div className="wizard-progress">
        <div className="progress-line-active" style={{ width: `${progressWidth}%` }} />
        {[1,2,3].map(i => (
           <div key={i} className={`progress-dot ${step >= i ? 'active' : ''}`} />
        ))}
      </div>

      <div className="form-header">
        <h2 className="form-title">
          {step === 1 && "Personal Info"}
          {step === 2 && "Account Details"}
          {step === 3 && "Services & Add-ons"}
        </h2>
        
        <div className="live-risk-indicator">
          <div className="live-risk-bar-track">
            <div 
              className="live-risk-bar-fill"
              style={{ 
                width: `${(liveScore / 10) * 100}%`,
                background: liveRisk.color,
                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.35s ease'
              }}
            />
          </div>
          <div className="live-risk-label">
            <span style={{ color: liveRisk.color, fontWeight: 800 }}>{liveRisk.level}</span>
            <span className="live-risk-pct">~{liveRisk.approxPct}% est.</span>
            <span className="live-risk-hint" title="Heuristic estimate only — run full analysis for accurate result">ⓘ</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        {step === 1 && (
          <div className="form-grid">
            <PillSelector 
               label="Gender" 
               options={['Male', 'Female']} 
               value={form.gender} 
               onChange={v => set('gender', v)} 
               firstRef={firstInputRef}
            />
            <YesNoToggle label="Senior Citizen" value={form.SeniorCitizen} onChange={v => set('SeniorCitizen', v)} />
            <YesNoToggle label="Has Partner" value={form.Partner} onChange={v => set('Partner', v)} />
            <YesNoToggle label="Has Dependents" value={form.Dependents} onChange={v => set('Dependents', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <div className="field-wrapper">
              <label htmlFor="tenure-input">Tenure (months)</label>
              <div className="input-wrapper suffix">
                <input 
                  id="tenure-input"
                  ref={firstInputRef}
                  type="number" 
                  className={`retainiq-input ${errors.tenure ? 'err' : ''}`} 
                  min={0} max={72} 
                  value={form.tenure}
                  aria-label="Tenure in months"
                  onChange={e => set('tenure', e.target.value)} 
                />
                <span className="input-suffix">mo</span>
              </div>
              {errors.tenure && <span className="inline-error">{errors.tenure}</span>}
            </div>

            <div className="field-wrapper">
              <label htmlFor="charge-input">Monthly Charges</label>
              <div className="input-wrapper prefix">
                <span className="input-prefix">$</span>
                <input 
                  id="charge-input"
                  type="number" 
                  className={`retainiq-input ${errors.MonthlyCharges ? 'err' : ''}`} 
                  step="0.01" min={0} 
                  value={form.MonthlyCharges}
                  aria-label="Monthly Charges Amount"
                  onChange={e => set('MonthlyCharges', e.target.value)} 
                />
              </div>
              {errors.MonthlyCharges && <span className="inline-error">{errors.MonthlyCharges}</span>}
            </div>

            <PillSelector 
               label="Contract Type" 
               options={['Month-to-month', 'One year', 'Two year']} 
               value={form.Contract} 
               riskMap={{ 'Month-to-month': 'Highest risk' }}
               onChange={v => set('Contract', v)} 
            />
            
            <PillSelector 
               label="Payment Method" 
               options={['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)']} 
               value={form.PaymentMethod} 
               onChange={v => set('PaymentMethod', v)} 
            />

            <YesNoToggle label="Paperless Billing" value={form.PaperlessBilling} onChange={v => set('PaperlessBilling', v)} />
          </div>
        )}

        {step === 3 && (
          <div className="form-grid">
            <PillSelector 
               label="Internet Service" 
               options={['Fiber optic', 'DSL', 'No']} 
               value={form.InternetService} 
               onChange={v => set('InternetService', v)} 
               firstRef={firstInputRef}
            />

            <PillSelector 
               label="Multiple Lines" 
               options={['Yes', 'No', 'No phone service']} 
               value={form.MultipleLines} 
               onChange={v => set('MultipleLines', v)} 
            />

            <YesNoToggle label="Phone Service" value={form.PhoneService} onChange={v => set('PhoneService', v)} />
            <YesNoToggle 
               label="Online Security" 
               value={form.OnlineSecurity} 
               riskTag={form.OnlineSecurity === 'No' ? '+Risk' : null}
               onChange={v => set('OnlineSecurity', v)} 
            />
            <YesNoToggle label="Online Backup" value={form.OnlineBackup} onChange={v => set('OnlineBackup', v)} />
            <YesNoToggle label="Device Protection" value={form.DeviceProtection} onChange={v => set('DeviceProtection', v)} />
            <YesNoToggle 
               label="Tech Support" 
               value={form.TechSupport} 
               riskTag={form.TechSupport === 'No' ? '+Risk' : null}
               onChange={v => set('TechSupport', v)} 
            />
            <YesNoToggle label="Streaming TV" value={form.StreamingTV} onChange={v => set('StreamingTV', v)} />
            <YesNoToggle label="Streaming Movies" value={form.StreamingMovies} onChange={v => set('StreamingMovies', v)} />
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button 
          className="btn-secondary" 
          aria-label="Go to previous step"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || loading}
        >
          Back
        </button>

        {step < 3 ? (
          <button 
            className="btn-primary" 
            aria-label="Go to next step"
            onClick={handleNext}
          >
            Next Step
          </button>
        ) : (
          <div className="btn-row">
            <button className="reset-btn" aria-label="Reset form data" onClick={handleReset} disabled={loading}>
              Reset
            </button>
            <button 
              className="btn-primary predict-btn" 
              aria-label="Run churn prediction analysis"
              onClick={handleSubmit} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Analyzing...</span>
                </>
              ) : 'Predict Churn Pipeline'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}