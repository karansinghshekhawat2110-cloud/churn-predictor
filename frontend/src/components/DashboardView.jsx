import { useState, useMemo, useEffect } from 'react';
import { Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './DashboardView.css';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p>Risk: {data.displayProb.toFixed(1)}%</p>
        <p>Level: {data.riskLevel}</p>
        <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px' }}>{data.time}</p>
      </div>
    );
  }
  return null;
};

// Customized dot for line chart mapping risk color
const renderCustomDot = (props) => {
  const { cx, cy, payload } = props;
  let fill = 'var(--success)';
  if (payload.riskLevel === 'High') fill = 'var(--danger)';
  if (payload.riskLevel === 'Medium') fill = 'var(--warning)';

  return (
    <circle cx={cx} cy={cy} r={4} stroke="#000" strokeWidth={2} fill={fill} />
  );
};

export default function DashboardView({ history, onClearHistory, onReloadEntry }) {
  const [showAll, setShowAll] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // desc = highest risk first
  const [confirmClear, setConfirmClear] = useState(false);

  // Clear confirm timeout logic
  useEffect(() => {
    let t;
    if (confirmClear) {
      t = setTimeout(() => setConfirmClear(false), 3000);
    }
    return () => clearTimeout(t);
  }, [confirmClear]);

  const handleClearClick = () => {
    if (confirmClear) {
      onClearHistory();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="empty-dash">
        <Activity size={52} color="var(--surface-2)" />
        <span className="empty-dash-title">No predictions yet</span>
        <span className="empty-dash-sub">Run your first analysis in the Prediction Engine tab.</span>
      </div>
    );
  }

  // Derived Stats
  const totalPreds = history.length;
  const highCount = history.filter(h => h.riskLevel === 'High').length;
  const highPct = totalPreds > 0 ? ((highCount / totalPreds) * 100).toFixed(1) : 0;
  
  const avgProb = history.reduce((acc, curr) => acc + curr.probability, 0) / totalPreds;
  
  // Top driver
  const featureCounts = {};
  history.forEach(h => {
    featureCounts[h.topFeature] = (featureCounts[h.topFeature] || 0) + 1;
  });
  let topDriver = 'N/A';
  let maxCount = 0;
  Object.entries(featureCounts).forEach(([feat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topDriver = feat;
    }
  });

  // Chart Data prep
  const lineData = useMemo(() => {
    // Last 20 entries, reversed
    return history.slice(0, 20).reverse().map((h, i) => ({
      index: i,
      displayProb: h.probability * 100,
      riskLevel: h.riskLevel,
      time: new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }));
  }, [history]);

  const pieData = [
    { name: 'High', value: history.filter(h => h.riskLevel === 'High').length, color: 'var(--danger)' },
    { name: 'Medium', value: history.filter(h => h.riskLevel === 'Medium').length, color: 'var(--warning)' },
    { name: 'Low', value: history.filter(h => h.riskLevel === 'Low').length, color: 'var(--success)' },
  ];

  // Table sorting & limits
  const displayHistory = useMemo(() => {
    let sorted = [...history];
    sorted.sort((a, b) => {
      if (sortOrder === 'desc') return b.probability - a.probability;
      return a.probability - b.probability;
    });
    return showAll ? sorted : sorted.slice(0, 15);
  }, [history, showAll, sortOrder]);

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

  return (
    <div className="dashboard-view">
      
      {/* SECTION 1: Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Predictions</span>
          <span className="stat-value">{totalPreds}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">High Risk %</span>
          <span className="stat-value">{highPct}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Churn Risk</span>
          <span className="stat-value">{(avgProb * 100).toFixed(1)}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Top Risk Driver</span>
          <span className="stat-value" style={{ fontSize: '18px', paddingTop: '8px' }}>
            {topDriver.length > 15 ? topDriver.substring(0,15) + '...' : topDriver}
          </span>
        </div>
      </div>

      {/* SECTION 2 & 3: Charts */}
      <div className="chart-row">
        <div className="chart-card">
          <h3 className="chart-title">Churn Risk Trend (Last 20)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="index" hide />
                <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={37} stroke="var(--muted)" strokeDasharray="4 2" label={{ position: 'insideTopLeft', value: 'Threshold', fill: 'var(--muted)', fontSize: 10 }} />
                <Line type="monotone" dataKey="displayProb" stroke="var(--border)" strokeWidth={2} dot={renderCustomDot} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Risk Distribution</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart margin={{ top: 10 }}>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="var(--border)" strokeWidth={2} isAnimationActive={false}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="square" wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: '700', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 4: History Table */}
      <div className="table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Time</th>
                <th onClick={toggleSort} style={{ minWidth: '100px' }}>Risk % {sortOrder === 'desc' ? '▼' : '▲'}</th>
                <th>Level</th>
                <th>Top Factor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayHistory.map((h) => {
                const date = new Date(h.timestamp);
                const timeStr = `${date.toLocaleDateString([], {month:'short', day:'numeric'})}, ${date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                const rawLevel = h.riskLevel.toLowerCase();
                
                return (
                  <tr key={h.id}>
                    <td>{timeStr}</td>
                    <td className="table-monospace">{(h.probability * 100).toFixed(1)}%</td>
                    <td>
                      <span className={`bulk-badge ${rawLevel}`}>{h.riskLevel}</span>
                    </td>
                    <td>{h.topFeature.length > 22 ? h.topFeature.substring(0, 22) + '...' : h.topFeature}</td>
                    <td>
                      <button className="action-btn-sm" onClick={() => onReloadEntry(h)}>Re-run →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {history.length > 15 && (
          <div className="table-footer">
            <button className="toggle-all-btn" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Collapse' : `Show all (${history.length})`}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 5: Footer */}
      <div className="clear-footer">
        <button 
          className={`btn-clear ${confirmClear ? 'confirm' : ''}`}
          onClick={handleClearClick}
        >
          {confirmClear ? 'Confirm Clear?' : 'Clear History'}
        </button>
      </div>

    </div>
  );
}
