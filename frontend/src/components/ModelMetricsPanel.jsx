import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, CartesianGrid
} from 'recharts';
import { X } from 'lucide-react';
import './ModelMetricsPanel.css';

export default function ModelMetricsPanel({ isOpen, onClose }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && !metrics && !loading) {
      setLoading(true);
      fetch('https://churn-predictor-api-zigm.onrender.com/model_metrics')
        .then(res => {
          if (!res.ok) throw new Error('Metrics not available');
          return res.json();
        })
        .then(data => {
          setMetrics(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isOpen, metrics, loading]);

  if (!isOpen && !metrics) return null;

  const summary = metrics?.summary || {};
  const cm = metrics?.confusion_matrix || {};

  return (
    <div className={`metrics-panel ${isOpen ? 'open' : ''}`}>
      <div className="metrics-header">
        <div className="metrics-title-row">
          <h3>Model Performance Deep-Dive</h3>
          <button className="close-panel-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        {metrics && (
          <div className="metrics-summary-row">
            <span className="metric-pill">ROC-AUC: {summary.roc_auc}</span>
            <span className="metric-pill">PR-AUC: {summary.pr_auc}</span>
            <span className="metric-pill">F1: {summary.f1}</span>
            <span className="metric-pill">Precision: {summary.precision}</span>
            <span className="metric-pill">Recall: {summary.recall}</span>
            <span className="metric-pill">Threshold: {summary.threshold}</span>
          </div>
        )}
      </div>

      {loading && <div className="metrics-loading">Loading performance data...</div>}
      {error && <div className="metrics-error">⚠️ {error}</div>}

      {metrics && (
        <div className="metrics-grid">
          {/* Chart 1: ROC Curve */}
          <div className="metric-chart-box">
            <h4 className="chart-label">ROC Curve</h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={metrics.roc_curve} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickCount={5} fontSize={10} label={{ value: 'FPR', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                  <YAxis type="number" domain={[0, 1]} tickCount={5} fontSize={10} label={{ value: 'TPR', position: 'insideLeft', angle: -90, fontSize: 10 }} />
                  <Tooltip formatter={(v) => (v * 100).toFixed(1) + '%'} contentStyle={{ fontSize: '10px', border: '2px solid #000', borderRadius: 0 }} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--muted)" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="tpr" stroke="var(--danger)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: PR Curve */}
          <div className="metric-chart-box">
            <h4 className="chart-label">Precision-Recall Curve</h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={metrics.pr_curve} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="recall" type="number" domain={[0, 1]} tickCount={5} fontSize={10} label={{ value: 'Recall', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                  <YAxis type="number" domain={[0, 1]} tickCount={5} fontSize={10} label={{ value: 'Precision', position: 'insideLeft', angle: -90, fontSize: 10 }} />
                  <Tooltip formatter={(v) => (v * 100).toFixed(1) + '%'} contentStyle={{ fontSize: '10px', border: '2px solid #000', borderRadius: 0 }} />
                  <Line type="monotone" dataKey="precision" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Confusion Matrix */}
          <div className="metric-chart-box">
            <h4 className="chart-label">Confusion Matrix (Threshold {summary.threshold})</h4>
            <div className="cm-wrapper">
              <div className="cm-headers-top">
                <span>PRED. STAY</span>
                <span>PRED. CHURN</span>
              </div>
              <div className="cm-body">
                <div className="cm-headers-left">
                  <span>ACTUAL STAY</span>
                  <span>ACTUAL CHURN</span>
                </div>
                <div className="cm-grid">
                  <div className="cm-cell success">
                    <span className="cm-val">{cm.tn}</span>
                    <span className="cm-lab">TN</span>
                  </div>
                  <div className="cm-cell warning">
                    <span className="cm-val">{cm.fp}</span>
                    <span className="cm-lab">FP</span>
                  </div>
                  <div className="cm-cell danger">
                    <span className="cm-val">{cm.fn}</span>
                    <span className="cm-lab">FN</span>
                  </div>
                  <div className="cm-cell success">
                    <span className="cm-val">{cm.tp}</span>
                    <span className="cm-lab">TP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 4: Feature Importance */}
          <div className="metric-chart-box">
            <h4 className="chart-label">Mean |SHAP| Importance (Top 15)</h4>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={metrics.feature_importances} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" fontSize={10} tickFormatter={v => v.toFixed(3)} />
                  <YAxis dataKey="feature" type="category" fontSize={9} width={150} />
                  <Tooltip formatter={v => v.toFixed(5)} contentStyle={{ fontSize: '10px', border: '2px solid #000', borderRadius: 0 }} />
                  <Bar dataKey="importance" fill="var(--accent)" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
