import { useState, useRef, useMemo } from 'react'

export default function BulkUploadView() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'churn_probability', direction: 'descending' })
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
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportCSV = () => {
    if(!batchResult) return
    const header = 'Customer ID,Churn Probability,Risk Level,Prediction,Top Factor'
    const rows = batchResult.results.map(r =>
      `${r.customer_id},${(r.churn_probability*100).toFixed(1)}%,${r.risk_level},${r.churn_prediction ? 'Churn' : 'Stay'},${r.top_reasons[0]?.feature ?? ''}`
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'retainiq_batch.csv'
    a.click()
  }

  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  }

  const sortedResults = useMemo(() => {
    let sortableItems = [...(batchResult?.results || [])];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [batchResult, sortConfig]);

  // Aggregate Stats Computations
  const total = batchResult?.results.length || 0;
  const high = batchResult?.results.filter(r=>r.risk_level === 'High').length || 0;
  const med = batchResult?.results.filter(r=>r.risk_level === 'Medium').length || 0;
  const low = batchResult?.results.filter(r=>r.risk_level === 'Low').length || 0;

  return (
    <div className="bulk-container">
      
      {!batchResult && (
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
          {loading && <div style={{ marginTop: '1rem', color: 'var(--accent)', fontWeight: '600' }}>Processing via Engine...</div>}
          {error && <div style={{ marginTop: '1rem', color: 'var(--danger)', fontWeight: '600' }}>Error: {error}</div>}
        </div>
      )}

      {batchResult && (
        <div className="dashboard-results">
          {/* Dashboard Summary UI */}
          <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
             <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
               <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '700' }}>Total Analyzed</div>
               <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>{total}</div>
             </div>
             <div style={{ background: 'var(--danger-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
               <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: '700' }}>High Risk</div>
               <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>{high}</div>
             </div>
             <div style={{ background: 'var(--success-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
               <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: '700' }}>Safe Status</div>
               <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{low}</div>
             </div>
          </div>

          {/* Stacked Risk Distribution Bar */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--muted)' }}>Risk Distribution</div>
            <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--surface-2)' }}>
               {high > 0 && <div style={{ width: `${(high/total)*100}%`, background: 'var(--danger)', transition: 'width 1s ease' }} title={`High: ${high}`} />}
               {med > 0 && <div style={{ width: `${(med/total)*100}%`, background: 'var(--warning)', transition: 'width 1s ease' }} title={`Medium: ${med}`} />}
               {low > 0 && <div style={{ width: `${(low/total)*100}%`, background: 'var(--success)', transition: 'width 1s ease' }} title={`Low: ${low}`} />}
            </div>
          </div>

          <div className="bulk-results-card">
            <div className="bulk-header">
              <span className="bulk-stat">Prediction Results</span>
              <button 
                onClick={exportCSV}
                style={{ padding: '0.4rem 0.8rem', background: '#FFF', border: '1px solid var(--border-2)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '0.4rem', color: 'var(--text)' }}
              >
                Output CSV ⬇️
              </button>
            </div>
            <div className="bulk-table-container">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th onClick={() => requestSort('churn_probability')} style={{ cursor: 'pointer' }}>
                      Churn Risk {sortConfig?.key === 'churn_probability' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '↕'}
                    </th>
                    <th>Status</th>
                    <th>Top Risk Factor (SHAP)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((row, idx) => (
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
          
          <button 
            onClick={() => setBatchResult(null)} 
            style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
          >
            ← Upload New Batch
          </button>
        </div>
      )}
    </div>
  )
}
