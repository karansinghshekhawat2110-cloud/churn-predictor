import React, { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Upload, Download, ArrowUp, ArrowDown, ChevronsUpDown, ChevronRight, ChevronDown, Filter, Search, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { validateBatchCSV, parseCSVText } from '../utils/csvValidator'
import './BulkUploadView.css'

export default function BulkUploadView() {
  const [loading, setLoading] = useState(false)
  const [batchResult, setBatchResult] = useState(null)
  const [validationReport, setValidationReport] = useState(null)
  const [fileData, setFileData] = useState(null) // Stores {headers, rows}
  
  const [sortConfig, setSortConfig] = useState({ key: 'churn_probability', direction: 'descending' })
  const [selectedRisks, setSelectedRisks] = useState(new Set(['High', 'Medium', 'Low']))
  const [probRange, setProbRange] = useState([0, 100])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [priorityMode, setPriorityMode] = useState(false)
  const fileInputRef = useRef(null)

  const downloadTemplate = () => {
    const csvContent = [
      "customerID,gender,SeniorCitizen,Partner,Dependents,tenure,PhoneService,MultipleLines,InternetService,OnlineSecurity,OnlineBackup,DeviceProtection,TechSupport,StreamingTV,StreamingMovies,Contract,PaperlessBilling,PaymentMethod,MonthlyCharges",
      "CUST-001,Male,0,Yes,No,2,Yes,No,Fiber optic,No,No,No,No,Yes,Yes,Month-to-month,Yes,Electronic check,95.50",
      "CUST-002,Female,0,Yes,Yes,34,Yes,Yes,DSL,Yes,Yes,No,Yes,No,No,One year,No,Bank transfer (automatic),55.20",
      "CUST-003,Male,1,No,No,60,Yes,No,Fiber optic,Yes,Yes,Yes,Yes,Yes,Yes,Two year,Yes,Credit card (automatic),79.99"
    ].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'retainiq_template.csv'
    a.click()
  }

  const runBatchPrediction = async (file) => {
    setLoading(true)
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
      setValidationReport(null)
      toast.success("Batch successfully compiled.")
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a valid .csv file format.")
      return
    }

    setBatchResult(null)
    setValidationReport(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const { headers, rows } = parseCSVText(text)
      setFileData({ headers, rows })

      const validation = validateBatchCSV(rows, headers)
      
      if (validation.missingColumns.length > 0) {
        toast.error(`Missing required columns: ${validation.missingColumns.join(', ')}`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (validation.errors.length > 0) {
        setValidationReport(validation)
        return
      }

      // No errors, proceed to API
      await runBatchPrediction(file)
    }
    reader.readAsText(file)
  }

  const processValidRows = async () => {
    if (!fileData || !validationReport) return
    
    const validRows = validationReport.validRowIndices.map(idx => fileData.rows[idx])
    if (validRows.length === 0) {
      toast.error("No valid rows to process.")
      return
    }

    const csvHeaders = fileData.headers.join(',')
    const csvRows = validRows.map(row => 
      fileData.headers.map(h => row[h]).join(',')
    ).join('\n')
    
    const csvContent = `${csvHeaders}\n${csvRows}`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const syntheticFile = new File([blob], 'filtered.csv', { type: 'text/csv' })

    await runBatchPrediction(syntheticFile)
  }

  const exportCSV = () => {
    if(!batchResult) return
    const header = 'Customer ID,Churn Probability,Risk Level,Prediction,All Risk Factors'
    const rows = filteredResults.map(r => {
      const factors = r.top_reasons.map(tr => `${tr.feature}:${tr.effect}`).join("; ")
      return `${r.customer_id},${(r.churn_probability*100).toFixed(1)}%,${r.risk_level},${r.churn_prediction ? 'Churn' : 'Stay'},${factors}`
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `retainiq_filtered_${filteredResults.length}.csv`
    a.click()
  }

  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  }

  const filteredResults = useMemo(() => {
    let items = [...(batchResult?.results || [])];
    
    // Filter by Risk
    items = items.filter(r => selectedRisks.has(r.risk_level));
    
    // Filter by Probability
    items = items.filter(r => {
      const p = Math.round(r.churn_probability * 100);
      return p >= probRange[0] && p <= probRange[1];
    });

    // Search
    if (searchQuery) {
      items = items.filter(r => r.customer_id.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Sort
    if (sortConfig !== null) {
      items.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [batchResult, sortConfig, selectedRisks, probRange, searchQuery]);

  const priorityRanking = useMemo(() => {
    if (!batchResult) return {};
    const sorted = [...batchResult.results].sort((a, b) => b.churn_probability - a.churn_probability);
    const map = {};
    sorted.forEach((r, i) => map[r.customer_id] = i + 1);
    return map;
  }, [batchResult]);

  // Aggregate Stats Computations
  const resultsToStat = filteredResults;
  const total = resultsToStat.length;
  const high = resultsToStat.filter(r=>r.risk_level === 'High').length;
  const med = resultsToStat.filter(r=>r.risk_level === 'Medium').length;
  const low = resultsToStat.filter(r=>r.risk_level === 'Low').length;

  // Recharts format
  const distributionData = [{ name: 'Risk', High: high, Medium: med, Low: low }]

  const [showAllErrors, setShowAllErrors] = useState(false)

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="bulk-container">
      
      {!batchResult && !validationReport && (
        <div 
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="dropzone-icon" size={38} />
          <div className="dropzone-title">Upload Bulk CSV</div>
          <div className="dropzone-desc">Drag and drop your .csv file here, or click to browse</div>
          
          <button 
            className="action-btn-sm" 
            style={{ marginTop: '1rem' }}
            onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
          >
            <Download size={14} /> Download Template CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
          {loading && <div style={{ marginTop: '1rem', color: 'var(--accent)', fontWeight: '600' }}>Processing Engine Vectors...</div>}
        </div>
      )}

      {validationReport && !batchResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="validation-panel">
          <div className="validation-header">
            <h3>VALIDATION REPORT</h3>
            <button className="close-btn" onClick={() => setValidationReport(null)}><XCircle size={18} /></button>
          </div>

          <div className="validation-summary">
            <div className="v-stat valid">
              <div className="v-stat-label">VALID ROWS</div>
              <div className="v-stat-value">{validationReport.summary.valid}</div>
            </div>
            <div className="v-stat invalid">
              <div className="v-stat-label">ROWS WITH ISSUES</div>
              <div className="v-stat-value">{validationReport.summary.invalid}</div>
            </div>
            <div className="v-stat total">
              <div className="v-stat-label">TOTAL ROWS</div>
              <div className="v-stat-value">{validationReport.summary.total}</div>
            </div>
          </div>

          <div className="error-list">
            <div className="error-list-title">Data Inconsistency Log:</div>
            {(showAllErrors ? validationReport.errors : validationReport.errors.slice(0, 8)).map((err, i) => (
              <div key={i} className="error-item">
                Row {err.row} — <span className="err-col">[{err.column}]</span>: {err.message}. Got: <span className="err-val">'{err.value}'</span>
              </div>
            ))}
            
            {validationReport.errors.length > 8 && (
              <button 
                className="show-more-btn" 
                onClick={() => setShowAllErrors(!showAllErrors)}
              >
                {showAllErrors ? 'Show Less' : `Show all ${validationReport.errors.length} errors`}
              </button>
            )}
          </div>

          <div className="validation-actions">
            <button 
              className="action-btn-primary" 
              onClick={processValidRows}
              disabled={loading || validationReport.summary.valid === 0}
            >
              {loading ? "Processing..." : `Process Valid Rows Only (${validationReport.summary.valid})`}
            </button>
            <button 
              className="action-btn-secondary" 
              onClick={() => setValidationReport(null)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {batchResult && (
        <motion.div initial={{opacity: 0, scale: 0.98}} animate={{opacity: 1, scale: 1}} className="dashboard-results">
          
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

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--muted)' }}>Risk Distribution Matrix</div>
            <ResponsiveContainer width="100%" height={32}>
              <BarChart layout="vertical" data={distributionData} margin={{top:0, right:0, left:0, bottom:0}} barSize={32}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }} />
                <Bar dataKey="High" stackId="a" fill="var(--danger)" radius={[4, 0, 0, 4]} />
                <Bar dataKey="Medium" stackId="a" fill="var(--warning)" />
                <Bar dataKey="Low" stackId="a" fill="var(--success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="batch-filter-bar">
            <div className="filter-row">
              <span className="filter-label">RISK:</span>
              <div className="filter-pills">
                {['High', 'Medium', 'Low'].map(r => (
                  <button 
                    key={r}
                    className={`filter-pill ${selectedRisks.has(r) ? 'active' : ''}`}
                    onClick={() => setSelectedRisks(prev => {
                      const n = new Set(prev);
                      n.has(r) ? n.delete(r) : n.add(r);
                      return n;
                    })}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <span className="filter-label" style={{ marginLeft: '1rem' }}>RISK RANGE:</span>
              <div className="range-inputs">
                <input type="number" value={probRange[0]} onChange={e=>setProbRange([parseInt(e.target.value)||0, probRange[1]])} min="0" max="99" />
                <div className="range-track">
                  <div className="range-fill" style={{ left: `${probRange[0]}%`, width: `${probRange[1]-probRange[0]}%` }}></div>
                </div>
                <input type="number" value={probRange[1]} onChange={e=>setProbRange([probRange[0], parseInt(e.target.value)||100])} min="1" max="100" />
              </div>
            </div>

            <div className="filter-row" style={{ marginTop: '0.75rem' }}>
              <div className="search-box">
                <Search size={14} color="var(--muted)" />
                <input 
                  type="text" 
                  placeholder="Search by customer ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              
              <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '1rem' }}>
                Showing {filteredResults.length} of {batchResult.results.length} customers
              </span>

              {(selectedRisks.size < 3 || probRange[0] !== 0 || probRange[1] !== 100 || searchQuery) && (
                <button className="clear-filter-link" onClick={() => {
                  setSelectedRisks(new Set(['High', 'Medium', 'Low']));
                  setProbRange([0, 100]);
                  setSearchQuery('');
                }}>
                  <XCircle size={12} /> Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="bulk-results-card">
            <div className="bulk-header">
              <span className="bulk-stat">Filtered Results</span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className={`pill-btn ${priorityMode ? 'active' : ''}`}
                  onClick={() => setPriorityMode(!priorityMode)}
                >
                  <Filter size={14} /> Priority Queue
                </button>
                <button 
                  onClick={exportCSV}
                  style={{ padding: '0.4rem 0.8rem', background: 'var(--surface-2)', border: '2px solid var(--border)', borderRadius: '0', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}
                >
                  <Download size={14} /> Export Filtered ({filteredResults.length})
                </button>
              </div>
            </div>
            <div className="bulk-table-container">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    {priorityMode && <th style={{ width: '50px' }}>Rank</th>}
                    <th>Customer ID</th>
                    <th onClick={() => requestSort('churn_probability')} style={{ cursor: 'pointer' }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        Churn Risk 
                        {sortConfig?.key === 'churn_probability' ? 
                          (sortConfig.direction === 'ascending' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) 
                          : <ChevronsUpDown size={12} color="var(--muted)" />}
                      </div>
                    </th>
                    <th>Status</th>
                    <th>Primary Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((row, idx) => {
                    const isExpanded = expandedRows.has(idx);
                    const rank = priorityRanking[row.customer_id];
                    const maxEffect = Math.max(...row.top_reasons.map(r => Math.abs(r.effect))) || 1;

                    return (
                      <React.Fragment key={idx}>
                        <tr onClick={() => setExpandedRows(prev => {
                          const n = new Set(prev);
                          n.has(idx) ? n.delete(idx) : n.add(idx);
                          return n;
                        })} style={{ cursor: 'pointer' }}>
                          <td>{isExpanded ? <ChevronDown size={14} color="var(--muted)"/> : <ChevronRight size={14} color="var(--muted)"/>}</td>
                          {priorityMode && <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>#{rank}</td>}
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{row.customer_id}</td>
                          <td className="table-monospace">{Math.round(row.churn_probability * 100)}%</td>
                          <td>
                            <span className={`bulk-badge ${row.risk_level.toLowerCase()}`}>
                              {row.risk_level}
                            </span>
                          </td>
                          <td>
                            {row.top_reasons[0] ? (
                              <span style={{ color: row.top_reasons[0].direction === 'increases risk' ? 'var(--danger)' : 'var(--success)', fontSize: '13px' }}>
                                {row.top_reasons[0].feature}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="expanded-row">
                            <td colSpan={priorityMode ? 6 : 5} style={{ background: 'var(--surface-2)', padding: '1rem 1.5rem' }}>
                              <h5 className="strategy-sec-title">Local Risk Distribution (SHAP)</h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                {row.top_reasons.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '11px', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.feature}</span>
                                    <div style={{ flex: 1, background: 'var(--border)', height: '8px', position: 'relative' }}>
                                      <div style={{ 
                                        position: 'absolute', 
                                        left: '0', 
                                        height: '100%', 
                                        width: `${(Math.abs(r.effect) / maxEffect) * 100}%`,
                                        background: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)'
                                      }}></div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontBold: '700', width: '40px', textAlign: 'right', color: r.direction === 'increases risk' ? 'var(--danger)' : 'var(--success)' }}>
                                      {r.effect > 0 ? '+' : ''}{r.effect}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {priorityMode && (
              <div style={{ padding: '0.75rem', borderTop: '2px solid var(--border)', fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)' }}>
                {(() => {
                  const all = batchResult.results;
                  const sorted = [...all].sort((a,b) => b.churn_probability - a.churn_probability);
                  const top10 = sorted.slice(0, 10);
                  const totalRisk = all.reduce((s, r) => s + r.churn_probability, 0);
                  const topRisk = top10.reduce((s, r) => s + r.churn_probability, 0);
                  const share = ((topRisk / totalRisk) * 100).toFixed(1);
                  return `Top 10 customers account for ${share}% of total portfolio churn risk.`;
                })()}
              </div>
            )}
          </div>

          <button 
            onClick={() => setBatchResult(null)} 
            style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
          >
            ← Upload New Batch
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
