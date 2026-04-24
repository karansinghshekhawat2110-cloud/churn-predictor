import { useState, useRef } from 'react'

export default function BulkUploadView() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check if it's a CSV
    if (!file.name.endsWith('.csv')) {
      setError("Please upload a valid .csv file.")
      return
    }

    setLoading(true)
    setError(null)
    setBatchResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Connect to the new backend endpoint we just wrote
      const response = await fetch('https://churn-predictor-api-zigm.onrender.com/predict_batch', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Batch prediction failed')
      }

      const data = await response.json()
      setBatchResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      // Reset input so they can upload same file again if they want
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bulk-container">
      
      <div 
        className="dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="dropzone-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div className="dropzone-title">Upload Bulk CSV</div>
        <div className="dropzone-desc">Drag and drop your .csv file here, or click to browse</div>
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        {loading && <div style={{ marginTop: '1rem', color: 'var(--accent)', fontWeight: '600' }}>Processing via XGBoost...</div>}
        {error && <div style={{ marginTop: '1rem', color: 'var(--danger)', fontWeight: '600' }}>Error: {error}</div>}
      </div>

      {batchResult && (
        <div className="bulk-results-card">
          <div className="bulk-header">
            <span className="bulk-stat">Total Insights: {batchResult.total_processed}</span>
            <span className="bulk-stat" style={{ color: 'var(--danger)' }}>
              High Risk: {batchResult.total_high_risk}
            </span>
          </div>
          <div className="bulk-table-container">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Churn Risk</th>
                  <th>Status</th>
                  <th>Top Risk Factor (SHAP)</th>
                </tr>
              </thead>
              <tbody>
                {batchResult.results.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.customer_id}</td>
                    <td>{Math.round(row.churn_probability * 100)}%</td>
                    <td>
                      <span className={`bulk-badge ${row.risk_level.toLowerCase()}`}>
                        {row.risk_level}
                      </span>
                    </td>
                    <td>
                      {row.top_reasons[0] ? (
                        <span style={{ color: row.top_reasons[0].direction === 'increases risk' ? 'var(--danger)' : 'var(--success)'}}>
                          {row.top_reasons[0].feature} ({row.top_reasons[0].effect > 0 ? '+' : ''}{row.top_reasons[0].effect})
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
