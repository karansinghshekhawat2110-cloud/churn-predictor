import { useState } from 'react'
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

export default function CustomerForm({ onPredict, loading }) {
  const [form, setForm] = useState(defaultForm)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => onPredict({
    ...form,
    SeniorCitizen: parseInt(form.SeniorCitizen),
    tenure: parseInt(form.tenure),
    MonthlyCharges: parseFloat(form.MonthlyCharges)
  })

  return (
    <div className="form-card">
      <div className="form-header">
        <div className="customer-avatar-interactive">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h2 className="form-title">Customer Profile</h2>
      </div>

      <div className="form-grid">

        {/* Personal */}
        <div className="section-label">Personal</div>

        <div className="field">
          <label>Gender</label>
          <select value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option>Male</option><option>Female</option>
          </select>
        </div>

        <div className="field">
          <label>Senior Citizen</label>
          <select value={form.SeniorCitizen} onChange={e => set('SeniorCitizen', e.target.value)}>
            <option value={0}>No</option><option value={1}>Yes</option>
          </select>
        </div>

        <div className="field">
          <label>Partner</label>
          <select value={form.Partner} onChange={e => set('Partner', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Dependents</label>
          <select value={form.Dependents} onChange={e => set('Dependents', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        {/* Account */}
        <div className="section-label">Account</div>

        <div className="field">
          <label>Tenure (months)</label>
          <div className="input-wrapper suffix">
            <input type="number" min={0} max={72} value={form.tenure}
              onChange={e => set('tenure', e.target.value)} />
            <span className="input-suffix">mo</span>
          </div>
        </div>

        <div className="field">
          <label>Monthly Charges</label>
          <div className="input-wrapper prefix">
            <span className="input-prefix">$</span>
            <input type="number" step="0.01" min={0} value={form.MonthlyCharges}
              onChange={e => set('MonthlyCharges', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Contract</label>
          <select value={form.Contract} onChange={e => set('Contract', e.target.value)}>
            <option>Month-to-month</option>
            <option>One year</option>
            <option>Two year</option>
          </select>
        </div>

        <div className="field">
          <label>Payment Method</label>
          <select value={form.PaymentMethod} onChange={e => set('PaymentMethod', e.target.value)}>
            <option>Electronic check</option>
            <option>Mailed check</option>
            <option>Bank transfer (automatic)</option>
            <option>Credit card (automatic)</option>
          </select>
        </div>

        <div className="field">
          <label>Paperless Billing</label>
          <select value={form.PaperlessBilling} onChange={e => set('PaperlessBilling', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        {/* Services */}
        <div className="section-label">Services</div>

        <div className="field">
          <label>Phone Service</label>
          <select value={form.PhoneService} onChange={e => set('PhoneService', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Multiple Lines</label>
          <select value={form.MultipleLines} onChange={e => set('MultipleLines', e.target.value)}>
            <option>Yes</option><option>No</option><option>No phone service</option>
          </select>
        </div>

        <div className="field">
          <label>Internet Service</label>
          <select value={form.InternetService} onChange={e => set('InternetService', e.target.value)}>
            <option>Fiber optic</option><option>DSL</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Online Security</label>
          <select value={form.OnlineSecurity} onChange={e => set('OnlineSecurity', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Online Backup</label>
          <select value={form.OnlineBackup} onChange={e => set('OnlineBackup', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Device Protection</label>
          <select value={form.DeviceProtection} onChange={e => set('DeviceProtection', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Tech Support</label>
          <select value={form.TechSupport} onChange={e => set('TechSupport', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Streaming TV</label>
          <select value={form.StreamingTV} onChange={e => set('StreamingTV', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

        <div className="field">
          <label>Streaming Movies</label>
          <select value={form.StreamingMovies} onChange={e => set('StreamingMovies', e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </div>

      </div>

      <button className="predict-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Predicting...' : 'Predict Churn'}
      </button>
    </div>
  )
}