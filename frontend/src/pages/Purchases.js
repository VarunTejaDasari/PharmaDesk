import { useToast } from '../Toast';
import React, { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { supplier_name: '', product_id: '', quantity_purchased: '', purchase_price: '', gst_percent: '', expiry_date: '', hsn_code: '' };

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Purchases() {
  const toast = useToast();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getPurchases(), api.getProducts()])
      .then(([p, prods]) => {
        setPurchases(Array.isArray(p) ? p : []);
        setProducts(Array.isArray(prods) ? prods : []);
        if (!Array.isArray(p) && p?.error) toast(p.error, 'error');
      })
      .catch(() => toast('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handle = (e) => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };
    if (name === 'product_id') {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        updated.purchase_price = prod.purchase_price;
        updated.hsn_code = prod.hsn_number || '';
      }
    }
    setForm(updated);
  };

  const gstAmount = () => {
    const base = Number(form.purchase_price || 0) * Number(form.quantity_purchased || 0);
    return base * (Number(form.gst_percent || 0) / 100);
  };

  const totalWithGst = () => {
    const base = Number(form.purchase_price || 0) * Number(form.quantity_purchased || 0);
    return base + gstAmount();
  };

  const save = async () => {
    if (!form.product_id || !form.quantity_purchased || !form.purchase_price) {
      toast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.addPurchase({
        product_id: Number(form.product_id),
        quantity_purchased: Number(form.quantity_purchased),
        purchase_price: Number(form.purchase_price),
        supplier_name: form.supplier_name,
        gst_percent: Number(form.gst_percent || 0),
        expiry_date: form.expiry_date || null,
        hsn_code: form.hsn_code,
      });
      toast('Purchase recorded successfully');
      load();
      setShowModal(false);
      setForm(EMPTY);
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = purchases.filter(p =>
    (p.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = purchases.reduce((acc, p) => acc + (p.quantity_purchased * p.purchase_price), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">{purchases.length} records · Total ₹{fmt(totalSpend)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Record Purchase</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Purchase History</span>
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              placeholder="Search purchases…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">↙</div>
            <p>{search ? 'No purchases match your search.' : 'No purchases recorded yet.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>HSN Code</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST%</th>
                  <th>Total Cost</th>
                  <th>Expiry</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const base = p.quantity_purchased * p.purchase_price;
                  const gst = base * ((p.gst_percent || 0) / 100);
                  return (
                    <tr key={p.id}>
                      <td className="muted mono">{String(i + 1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: 500 }}>{p.product_name || '—'}</td>
                      <td>{p.supplier_name || <span className="muted">—</span>}</td>
                      <td className="mono">{p.hsn_code || <span className="muted">—</span>}</td>
                      <td className="mono">{p.quantity_purchased}</td>
                      <td className="mono">₹{fmt(p.purchase_price)}</td>
                      <td className="mono">{p.gst_percent > 0 ? `${p.gst_percent}%` : <span className="muted">—</span>}</td>
                      <td className="mono" style={{ color: 'var(--amber)' }}>₹{fmt(base + gst)}</td>
                      <td className="muted">{fmtDate(p.expiry_date)}</td>
                      <td className="muted">{fmtDate(p.purchase_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record New Purchase</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Supplier Name at TOP */}
              <div className="field">
                <label>Supplier Name</label>
                <input name="supplier_name" value={form.supplier_name} onChange={handle} placeholder="e.g. MedSupply Co." />
              </div>
              <div className="field">
                <label>Product *</label>
                <select name="product_id" value={form.product_id} onChange={handle}>
                  <option value="">— Select product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Current stock: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Quantity Purchased *</label>
                  <input name="quantity_purchased" type="number" value={form.quantity_purchased} onChange={handle} placeholder="0" />
                </div>
                <div className="field">
                  <label>Purchase Price (₹) *</label>
                  <input name="purchase_price" type="number" value={form.purchase_price} onChange={handle} placeholder="0.00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>GST (%)</label>
                  <input name="gst_percent" type="number" min="0" max="100" value={form.gst_percent} onChange={handle} placeholder="e.g. 12" />
                </div>
                <div className="field">
                  <label>Expiry Date</label>
                  <input name="expiry_date" type="date" value={form.expiry_date} onChange={handle} />
                </div>
              </div>
              <div className="field">
                <label>HSN Code</label>
                <input name="hsn_code" value={form.hsn_code} onChange={handle} placeholder="e.g. 30049099" />
              </div>
              {form.product_id && form.quantity_purchased && (
                <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: 11 }}>BASE COST</span>
                    <span className="mono">₹{fmt(Number(form.purchase_price || 0) * Number(form.quantity_purchased || 0))}</span>
                  </div>
                  {Number(form.gst_percent) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="muted" style={{ fontSize: 11 }}>GST ({form.gst_percent}%)</span>
                      <span className="mono">₹{fmt(gstAmount())}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(245,158,11,0.25)', paddingTop: 8, marginTop: 4 }}>
                    <span className="muted" style={{ fontSize: 11 }}>TOTAL COST</span>
                    <div style={{ color: 'var(--amber)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                      ₹{fmt(totalWithGst())}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Record Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
