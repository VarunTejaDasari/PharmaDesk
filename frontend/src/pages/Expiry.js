import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../Toast';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const statusBadge = (days) => {
  if (days === null || days === undefined) return null;
  if (days < 0)   return { label: 'Expired',           cls: 'badge-red'   };
  if (days === 0) return { label: 'Expires Today',      cls: 'badge-red'   };
  if (days <= 7)  return { label: `${days}d left`,      cls: 'badge-red'   };
  if (days <= 30) return { label: `${days}d left`,      cls: 'badge-amber' };
  return           { label: `${days}d left`,             cls: 'badge-green' };
};

export default function Expiry() {
  const toast = useToast();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [alerts, setAlerts]       = useState([]);
  const [editModal, setEditModal] = useState(null);   // product object
  const [expDate, setExpDate]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('all');  // all | expiring | expired

  const load = async () => {
    setLoading(true);
    try {
      const [all, alertList] = await Promise.all([
        api.get('/expiry'),
        api.get('/expiry/alerts'),
      ]);
      setProducts(Array.isArray(all) ? all : []);
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch {
      toast('Failed to load expiry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (p) => { setEditModal(p); setExpDate(p.expiry_date?.split('T')[0] || ''); };

  const saveExpiry = async () => {
    if (!expDate) { toast('Please select a date', 'error'); return; }
    setSaving(true);
    try {
      await api.put(`/expiry/${editModal.id}`, { expiry_date: expDate });
      toast('Expiry date updated!');
      setEditModal(null);
      load();
    } catch {
      toast('Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const allProds = products;
  const displayed = filter === 'all'      ? allProds
                  : filter === 'expiring' ? allProds.filter(p => p.days_left >= 0 && p.days_left <= 30)
                  :                         allProds.filter(p => p.days_left < 0);

  const expiredCount  = allProds.filter(p => p.days_left < 0).length;
  const expiringCount = allProds.filter(p => p.days_left >= 0 && p.days_left <= 30).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expiry Tracker</h1>
          <p className="page-subtitle">Monitor medicine shelf life & auto-alerts</p>
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}></span>
          <span style={{ fontWeight: 600, color: 'var(--red)' }}>
            {alerts.length} product{alerts.length > 1 ? 's' : ''} expiring within 30 days or already expired.
          </span>
        </div>
      )}

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all',      label: `All (${allProds.length})`,         cls: '' },
          { key: 'expiring', label: `Expiring Soon (${expiringCount})`, cls: 'badge-amber' },
          { key: 'expired',  label: `Expired (${expiredCount})`,        cls: 'badge-red'   },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Medicine Expiry Dates</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading…</span></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p>No products in this category. Set expiry dates via the Edit button.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Company</th>
                  <th>Qty</th>
                  <th>Expiry Date</th>
                  <th>Time Left</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((p, i) => {
                  const badge = statusBadge(p.days_left);
                  return (
                    <tr key={p.id}>
                      <td className="muted mono">{String(i + 1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td>{p.company || <span className="muted">—</span>}</td>
                      <td className="mono">{p.quantity}</td>
                      <td className="mono">{fmt(p.expiry_date)}</td>
                      <td>
                        {p.days_left < 0
                          ? <span className="mono red">{Math.abs(p.days_left)}d ago</span>
                          : <span className="mono">{p.days_left}d</span>}
                      </td>
                      <td>
                        {badge
                          ? <span className={`badge ${badge.cls}`}>{badge.label}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          Set Date
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Set Expiry: {editModal.name}</span>
              <button className="modal-close" onClick={() => setEditModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveExpiry} disabled={saving}>
                {saving ? 'Saving…' : 'Update Expiry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
