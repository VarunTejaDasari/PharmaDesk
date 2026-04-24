import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../Toast';

export default function Forecast() {
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.get('/forecast')
      .then(setData)
      .catch(() => toast('Failed to load forecast', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const items = data?.items ?? [];
  const filtered = items.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const urgent   = items.filter(p => p.shortfall > 0).length;
  const adequate = items.filter(p => p.shortfall === 0).length;

  const urgencyColor = (shortfall) => {
    if (shortfall === 0) return 'var(--accent)';
    if (shortfall <= 10) return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demand Forecast</h1>
          <p className="page-subtitle">
            Predicted demand for {data?.forecast_month ?? '…'}
            {data ? ` · Seasonal factor: ×${data.trend_factor}` : ''}
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 140 }}>
          <div className="stat-label">Needs Reorder</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{urgent}</div>
          <div className="stat-sub">items below forecast</div>
        </div>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 140 }}>
          <div className="stat-label">Sufficient Stock</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{adequate}</div>
          <div className="stat-sub">items well-stocked</div>
        </div>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
          <div className="stat-label">Forecast Method</div>
          <div className="stat-value" style={{ fontSize: 14, lineHeight: 1.4 }}>Avg × Trend</div>
          <div className="stat-sub">3-month avg · seasonal factor</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Next Month Predictions</span>
          <div className="panel-actions">
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading forecast…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p>No sales data yet. Record some sales to enable forecasting.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Company</th>
                  <th>Current Stock</th>
                  <th>Avg Monthly Sales</th>
                  <th>Predicted Demand</th>
                  <th>Shortfall</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td className="muted mono">{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.company || <span className="muted">—</span>}</td>
                    <td className="mono">{p.current_stock}</td>
                    <td className="mono">{p.avg_monthly_sales}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{p.predicted_demand}</td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: urgencyColor(p.shortfall), fontWeight: 600 }}
                      >
                        {p.shortfall > 0 ? `−${p.shortfall}` : '✓ 0'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.shortfall > 0 ? 'badge-amber' : 'badge-green'}`}>
                        {p.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Methodology note */}
      <div style={{
        marginTop: 16,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--muted)',
        border: '1px solid var(--border)',
      }}>
        <strong>How it works:</strong> Predicted Demand = (Average monthly sales over last 3 months) × Seasonal trend factor.
        Trend factors account for flu/dengue/monsoon seasons common in India. Items with zero sales history show 0 predicted demand — start recording sales to improve accuracy.
      </div>
    </div>
  );
}
