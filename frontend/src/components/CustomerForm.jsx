import { useState, useMemo } from 'react'
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

// User-provided hook for live frontend heuristic risk prediction
const getLiveRisk = (form) => {
  let score = 0
  if (form.tenure < 12) score += 2
  if (form.Contract === 'Month-to-month') score += 3
  if (form.InternetService === 'Fiber optic') score += 1
  if (form.PaymentMethod === 'Electronic check') score += 1
  if (form.OnlineSecurity === 'No') score += 1
  if (score >= 5) return 'High'
  if (score >= 3) return 'Medium'
  return 'Low'
}

// Subcomponents
const YesNoToggle = ({ label, value, onChange }) => (
  <div className="toggle-group">
    <label>{label}</label>
    <button 
      type="button" 
      className={`toggle-track ${value === 'Yes' || value == 1 ? 'active' : ''}`}
      onClick={() => onChange(value === 'Yes' ? 'No' : (value == 1 ? 0 : (value === 'No' ? 'Yes' : 1)))}
    >
      <div className="toggle-thumb" />
    </button>
  </div>
)

const PillSelector = ({ label, options, value, onChange }) => (
  <div className="pill-group">
    <label>{label}</label>
    <div className="pill-container">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`pill-btn ${value === opt ? 'active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
)

export default function CustomerForm({ onPredict, loading }) {
  const [form, setForm] = useState(defaultForm)
  const [step, setStep] = useState(1)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const liveRisk = useMemo(() => getLiveRisk(form), [form])

  const handleSubmit = () => onPredict({
    ...form,
    SeniorCitizen: parseInt(form.SeniorCitizen),
    tenure: parseInt(form.tenure),
    MonthlyCharges: parseFloat(form.MonthlyCharges)
  })

  // Calculate progress bar line width
  const progressWidth = step === 1 ? 0 : step === 2 ? 50 : 100

  return (
    <div className="form-card">
      
      {/* 3 Dot Progress Layout */}
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
        <div className="live-risk-pill" title="Rough estimate — click Predict for full analysis">
          <div className={`risk-dot ${liveRisk}`}></div>
          {liveRisk} Risk
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
            />
            <YesNoToggle label="Senior Citizen" value={form.SeniorCitizen} onChange={v => set('SeniorCitizen', v)} />
            <YesNoToggle label="Has Partner" value={form.Partner} onChange={v => set('Partner', v)} />
            <YesNoToggle label="Has Dependents" value={form.Dependents} onChange={v => set('Dependents', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <div className="field-wrapper">
              <label>Tenure (months)</label>
              <div className="input-wrapper suffix">
                <input type="number" className="retainiq-input" min={0} max={72} value={form.tenure}
                  onChange={e => set('tenure', e.target.value)} />
                <span className="input-suffix">mo</span>
              </div>
            </div>

            <div className="field-wrapper">
              <label>Monthly Charges</label>
              <div className="input-wrapper prefix">
                <span className="input-prefix">$</span>
                <input type="number" className="retainiq-input" step="0.01" min={0} value={form.MonthlyCharges}
                  onChange={e => set('MonthlyCharges', e.target.value)} />
              </div>
            </div>

            <PillSelector 
               label="Contract Type" 
               options={['Month-to-month', 'One year', 'Two year']} 
               value={form.Contract} 
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
            />

            <PillSelector 
               label="Multiple Lines" 
               options={['Yes', 'No', 'No phone service']} 
               value={form.MultipleLines} 
               onChange={v => set('MultipleLines', v)} 
            />

            <YesNoToggle label="Phone Service" value={form.PhoneService} onChange={v => set('PhoneService', v)} />
            <YesNoToggle label="Online Security" value={form.OnlineSecurity} onChange={v => set('OnlineSecurity', v)} />
            <YesNoToggle label="Online Backup" value={form.OnlineBackup} onChange={v => set('OnlineBackup', v)} />
            <YesNoToggle label="Device Protection" value={form.DeviceProtection} onChange={v => set('DeviceProtection', v)} />
            <YesNoToggle label="Tech Support" value={form.TechSupport} onChange={v => set('TechSupport', v)} />
            <YesNoToggle label="Streaming TV" value={form.StreamingTV} onChange={v => set('StreamingTV', v)} />
            <YesNoToggle label="Streaming Movies" value={form.StreamingMovies} onChange={v => set('StreamingMovies', v)} />
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button 
          className="btn-secondary" 
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || loading}
        >
          Back
        </button>

        {step < 3 ? (
          <button 
            className="btn-primary" 
            onClick={() => setStep(s => Math.min(3, s + 1))}
          >
            Next Step
          </button>
        ) : (
          <button 
            className="btn-primary" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Predict Churn Pipeline'}
          </button>
        )}
      </div>
    </div>
  )
}