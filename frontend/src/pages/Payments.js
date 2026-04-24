import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../Toast';

const EMPTY_FORM = {
  party_name: '', party_type: 'customer',
  total_amount: '', description: '', due_date: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
}) : '—';

const fmtAmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status, balance) => {
  if (status === 'paid')    return { label: 'Paid',         cls: 'badge-green' };
  if (status === 'partial') return { label: 'Partial',      cls: 'badge-amber' };
  return                           { label: 'Pending',      cls: 'badge-red'   };
};

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);   // 'add' | payment object (for pay)
  const [form, setForm]           = useState(EMPTY_FORM);
  const [payAmt, setPayAmt]       = useState('');
  const [payNote, setPayNote]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('all'); // all | pending | partial | paid
  const [typeFilter, setTypeFilter] = useState('all'); // all | customer | supplier

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/payments');
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const saveNew = async () => {
    if (!form.party_name || !form.total_amount) {
      toast('Party name and amount are required', 'error'); return;
    }
    setSaving(true);
    try {
      await api.post('/payments', form);
      toast('Payment record created!');
      setModal(null);
      load();
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recordPay = async () => {
    if (!payAmt || Number(payAmt) <= 0) {
      toast('Enter a valid amount', 'error'); return;
    }
    setSaving(true);
    try {
      await api.post(`/payments/${modal.id}/pay`, { amount: payAmt, note: payNote });
      toast('Payment recorded!');
      setModal(null);
      load();
    } catch {
      toast('Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/payments/${id}`);
      toast('Deleted.');
      load();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const totalPending = payments
    .filter(p => p.status !== 'paid')
    .reduce((s, p) => s + Number(p.balance_due), 0);

  const customerOwing = payments
    .filter(p => p.party_type === 'customer' && p.status !== 'paid')
    .reduce((s, p) => s + Number(p.balance_due), 0);

  const supplierOwing = payments
    .filter(p => p.party_type === 'supplier' && p.status !== 'paid')
    .reduce((s, p) => s + Number(p.balance_due), 0);

  let displayed = payments;
  if (filter !== 'all')     displayed = displayed.filter(p => p.status === filter);
  if (typeFilter !== 'all') displayed = displayed.filter(p => p.party_type === typeFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Payments</h1>
          <p className="page-subtitle">Track money owed to you and by you</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('add'); }}>
          + Add Payment
        </button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>₹{fmtAmt(totalPending)}</div>
          <div className="stat-sub">across all parties</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customers Owe You</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>₹{fmtAmt(customerOwing)}</div>
          <div className="stat-sub">receivable</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">You Owe Suppliers</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>₹{fmtAmt(supplierOwing)}</div>
          <div className="stat-sub">payable</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending', 'partial', 'paid'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, textTransform: 'capitalize' }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ margin: '0 4px', borderLeft: '1px solid var(--border)' }} />
        {['all', 'customer', 'supplier'].map(t => (
          <button
            key={t}
            className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, textTransform: 'capitalize' }}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Payment Records</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading…</span></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <p>No payment records yet. Add one to start tracking.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Party</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((p, i) => {
                  const badge = statusBadge(p.status);
                  const overdue = p.due_date && new Date(p.due_date) < new Date() && p.status !== 'paid';
                  return (
                    <tr key={p.id}>
                      <td className="muted mono">{String(i + 1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 500 }}>
                        {p.party_name}
                        {p.description && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.party_type === 'customer' ? 'badge-green' : 'badge-amber'}`}>
                          {p.party_type}
                        </span>
                      </td>
                      <td className="mono">₹{fmtAmt(p.total_amount)}</td>
                      <td className="mono green">₹{fmtAmt(p.paid_amount)}</td>
                      <td className="mono" style={{ color: Number(p.balance_due) > 0 ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                        ₹{fmtAmt(p.balance_due)}
                      </td>
                      <td className={overdue ? 'red mono' : 'mono'}>{fmtDate(p.due_date)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        {p.status !== 'paid' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setModal(p); setPayAmt(''); setPayNote('');
                          }}>
                            Pay
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                          onClick={() => deletePayment(p.id)}>
                          ✕
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

      {/* Add Modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Payment Record</span>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Party Name *</label>
                <input name="party_name" value={form.party_name} onChange={handle} placeholder="e.g. Ramesh Medical, Cipla Ltd" />
              </div>
              <div className="field">
                <label>Type *</label>
                <select name="party_type" value={form.party_type} onChange={handle}>
                  <option value="customer">Customer (they owe you)</option>
                  <option value="supplier">Supplier (you owe them)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Total Amount (₹) *</label>
                  <input name="total_amount" type="number" value={form.total_amount} onChange={handle} placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <input name="due_date" type="date" value={form.due_date} onChange={handle} />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input name="description" value={form.description} onChange={handle} placeholder="e.g. Invoice #102, Credit sale" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNew} disabled={saving}>
                {saving ? 'Saving…' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {modal && modal !== 'add' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record Payment — {modal.party_name}</span>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                <div>Total: <strong>₹{fmtAmt(modal.total_amount)}</strong></div>
                <div>Paid so far: <strong className="green">₹{fmtAmt(modal.paid_amount)}</strong></div>
                <div>Balance due: <strong style={{ color: 'var(--red)' }}>₹{fmtAmt(modal.balance_due)}</strong></div>
              </div>
              <div className="field">
                <label>Amount Paying Now (₹) *</label>
                <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="0.00" />
              </div>
              <div className="field">
                <label>Note (optional)</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. Cash, UPI, Cheque #123" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={recordPay} disabled={saving}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
