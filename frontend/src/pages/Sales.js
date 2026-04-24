import { useToast } from '../Toast';
import React, { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { product_id: '', quantity_sold: '', sale_price: '', buyer_name: '', buyer_type: 'retailer', gst_percent: '', expiry_date: '' };

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Sales() {
  const toast = useToast();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getSales(), api.getProducts()])
      .then(([s, p]) => {
        setSales(Array.isArray(s) ? s : []);
        setProducts(Array.isArray(p) ? p : []);
        if (!Array.isArray(s) && s?.error) toast(s.error, 'error');
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
      if (prod) updated.sale_price = prod.selling_price;
    }
    setForm(updated);
  };

  const gstAmount = () => {
    const base = Number(form.sale_price || 0) * Number(form.quantity_sold || 0);
    return base * (Number(form.gst_percent || 0) / 100);
  };

  const totalWithGst = () => {
    const base = Number(form.sale_price || 0) * Number(form.quantity_sold || 0);
    return base + gstAmount();
  };

  const save = async () => {
    if (!form.product_id || !form.quantity_sold || !form.sale_price) {
      toast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.addSale({
        product_id: Number(form.product_id),
        quantity_sold: Number(form.quantity_sold),
        sale_price: Number(form.sale_price),
        buyer_name: form.buyer_name,
        buyer_type: form.buyer_type,
        gst_percent: Number(form.gst_percent || 0),
        expiry_date: form.expiry_date || null,
      });
      toast('Sale recorded successfully');
      load();
      setShowModal(false);
      setForm(EMPTY);
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = sales.filter(s =>
    (s.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.buyer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = sales.reduce((acc, s) => acc + (s.quantity_sold * s.sale_price), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">{sales.length} transactions · Total ₹{fmt(totalRevenue)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Record Sale</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Sales History</span>
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              placeholder="Search sales…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">↗</div>
            <p>{search ? 'No sales match your search.' : 'No sales recorded yet.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Sale Price</th>
                  <th>GST%</th>
                  <th>Total</th>
                  <th>Buyer</th>
                  <th>Type</th>
                  <th>Expiry</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const base = s.quantity_sold * s.sale_price;
                  const gst = base * ((s.gst_percent || 0) / 100);
                  return (
                    <tr key={s.id}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {s.bill_number || String(i + 1).padStart(6, '0')}
                      </td>
                      <td style={{ fontWeight: 500 }}>{s.product_name || '—'}</td>
                      <td className="mono">{s.quantity_sold}</td>
                      <td className="mono">₹{fmt(s.sale_price)}</td>
                      <td className="mono">{s.gst_percent > 0 ? `${s.gst_percent}%` : <span className="muted">—</span>}</td>
                      <td className="mono green">₹{fmt(base + gst)}</td>
                      <td>{s.buyer_name || <span className="muted">—</span>}</td>
                      <td>
                        <span className={`badge ${s.buyer_type === 'wholesaler' ? 'badge-blue' : 'badge-purple'}`}>
                          {s.buyer_type}
                        </span>
                      </td>
                      <td className="muted">{fmtDate(s.expiry_date)}</td>
                      <td className="muted">{fmtDate(s.sale_date)}</td>
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
              <span className="modal-title">Record New Sale</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Product *</label>
                <select name="product_id" value={form.product_id} onChange={handle}>
                  <option value="">— Select product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Quantity Sold *</label>
                  <input name="quantity_sold" type="number" value={form.quantity_sold} onChange={handle} placeholder="0" />
                </div>
                <div className="field">
                  <label>Sale Price (₹) *</label>
                  <input name="sale_price" type="number" value={form.sale_price} onChange={handle} placeholder="0.00" />
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
                <label>Buyer Name</label>
                <input name="buyer_name" value={form.buyer_name} onChange={handle} placeholder="e.g. City Pharmacy" />
              </div>
              <div className="field">
                <label>Buyer Type</label>
                <select name="buyer_type" value={form.buyer_type} onChange={handle}>
                  <option value="retailer">Retailer</option>
                  <option value="wholesaler">Wholesaler</option>
                </select>
              </div>
              {form.product_id && form.quantity_sold && (
                <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: 11 }}>BASE AMOUNT</span>
                    <span className="mono">₹{fmt(Number(form.sale_price || 0) * Number(form.quantity_sold || 0))}</span>
                  </div>
                  {Number(form.gst_percent) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="muted" style={{ fontSize: 11 }}>GST ({form.gst_percent}%)</span>
                      <span className="mono">₹{fmt(gstAmount())}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--accent-glow)', paddingTop: 8, marginTop: 4 }}>
                    <span className="muted" style={{ fontSize: 11 }}>TOTAL AMOUNT</span>
                    <div className="green" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                      ₹{fmt(totalWithGst())}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Record Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
