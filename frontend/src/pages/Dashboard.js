import { useToast } from '../Toast';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
 
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marginRevealed, setMarginRevealed] = useState(false);
 
  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
 
  if (loading) return (
    <div className="loading"><div className="spinner" /><span>Loading dashboard…</span></div>
  );
 
  const dailyMargin = data?.margin ?? 0;
  const monthlyMargin = data?.monthlyMargin ?? 0;

  const stats = [
    { label: 'Total Products', value: data?.totalProducts ?? '—', sub: 'registered items', icon: '▦', color: 'var(--accent)' },
    { label: 'Total Stock', value: data?.totalStock ?? '—', sub: 'units in inventory', icon: '◧', color: 'var(--blue)' },
    { label: "Today's Revenue", value: `₹${fmt(data?.dailySales)}`, sub: `${data?.unitsSold ?? 0} units sold`, icon: '↗', color: 'var(--amber)' },
  ];
 
  const lowStock = data?.lowStock ?? [];
 
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live inventory & sales overview</p>
        </div>
        <span className="badge badge-green">● Live</span>
      </div>
 
      {/* Stat Cards */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}

        {/* Combined Margin Card — click to reveal */}
        <div
          className="stat-card"
          onClick={() => setMarginRevealed(r => !r)}
          style={{ cursor: 'pointer', position: 'relative', userSelect: 'none' }}
          title="Click to reveal margin"
        >
          <div className="stat-icon" style={{ color: dailyMargin >= 0 ? 'var(--accent)' : 'var(--red)' }}>◈</div>
          <div className="stat-label">Margin</div>

          {!marginRevealed ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginTop: 8, marginBottom: 4
              }}>
                <div style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-glow)',
                  borderRadius: 8,
                  padding: '6px 18px',
                  fontSize: 13,
                  color: 'var(--muted)',
                  letterSpacing: 3,
                }}>
                  ●●●●●
                </div>
              </div>
              <div className="stat-sub" style={{ color: 'var(--accent)', fontSize: 11 }}>
                 Click to reveal
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>TODAY</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: dailyMargin >= 0 ? 'var(--accent)' : 'var(--red)'
                }}>
                  ₹{fmt(dailyMargin)}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>THIS MONTH</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: monthlyMargin >= 0 ? 'var(--accent)' : 'var(--red)'
                }}>
                  ₹{fmt(monthlyMargin)}
                </div>
              </div>
              <div className="stat-sub" style={{ color: 'var(--muted)', fontSize: 10, marginTop: 4 }}>
                 Click to hide
              </div>
            </>
          )}
        </div>
      </div>
 
      {/* Low Stock Alert */}
      <div className="dash-grid">
        <div className="panel col-span-2" style={{ animationDelay: '0.25s' }}>
          <div className="panel-header">
            <span className="panel-title">⚠ Low Stock Alert</span>
            <span className="badge badge-red">{lowStock.length} items</span>
          </div>
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>All products are sufficiently stocked.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity Remaining</th>
                    <th>Stock Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p, i) => {
                    const pct = Math.min(100, (p.quantity / 10) * 100);
                    return (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td><span className="mono red">{p.quantity}</span> units</td>
                        <td>
                          <div className="low-stock-bar">
                            <div className="low-stock-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${p.quantity === 0 ? 'badge-red' : 'badge-amber'}`}>
                            {p.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
