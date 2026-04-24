import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../Toast';

const EMPTY = { name: '', company: '', quantity_per_pack: '', hsn_number: '' };

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Products() {
  const toast = useToast();
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [subModal, setSubModal]     = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.getProducts()
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) && data?.error) toast(data.error || 'Failed to load products', 'error');
      })
      .catch(() => { setProducts([]); toast('Failed to load products', 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p) => { setForm({ quantity: p.quantity }); setModal(p); };
  const closeModal = () => setModal(null);
  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    if (modal === 'add') {
      if (!form.name) { toast('Product name is required', 'error'); return; }
    }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.addProduct({
          name: form.name,
          company: form.company,
          quantity_per_pack: Number(form.quantity_per_pack) || 1,
          hsn_number: form.hsn_number,
        });
        toast('Product added successfully');
      } else {
        await api.updateProduct(modal.id, { quantity: Number(form.quantity) });
        toast('Product updated');
      }
      load();
      closeModal();
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const findSubstitutes = async (product) => {
    setSubLoading(true);
    setSubModal({ original: product, substitutes: [] });
    try {
      const data = await api.get(`/substitutes/${product.id}`);
      setSubModal({ original: data.original || product, substitutes: data.substitutes || [] });
    } catch {
      toast('Failed to fetch substitutes', 'error');
      setSubModal(null);
    } finally {
      setSubLoading(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} items registered</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Inventory</span>
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
          <div className="loading"><div className="spinner" /><span>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▦</div>
            <p>{search ? 'No products match your search.' : 'No products yet. Add your first one!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>UN Code</th>
                  <th>Product Name</th>
                  <th>Company</th>
                  <th>HSN No.</th>
                  <th>Qty/Pack</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="muted mono">{p.un_code || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.company || <span className="muted">—</span>}</td>
                    <td className="mono">{p.hsn_number || <span className="muted">—</span>}</td>
                    <td className="mono">{p.quantity_per_pack || 1}</td>
                    <td>
                      <span className={`mono ${p.quantity < 10 ? 'red' : 'green'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.quantity === 0 ? 'badge-red' : p.quantity < 10 ? 'badge-amber' : 'badge-green'}`}>
                        {p.quantity === 0 ? 'Out of Stock' : p.quantity < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                        Edit Qty
                      </button>
                      {p.quantity === 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--amber)' }}
                          onClick={() => findSubstitutes(p)}
                        >
                          Substitutes
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'add' ? 'Add New Product' : `Edit: ${modal.name}`}</span>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {modal === 'add' ? (
                <>
                  <div className="field">
                    <label>Product Name *</label>
                    <input name="name" value={form.name} onChange={handle} placeholder="e.g. Paracetamol 500mg" />
                  </div>
                  <div className="field">
                    <label>Company</label>
                    <input name="company" value={form.company} onChange={handle} placeholder="e.g. Sun Pharma" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>HSN Number</label>
                      <input name="hsn_number" value={form.hsn_number} onChange={handle} placeholder="e.g. 30049099" />
                    </div>
                    <div className="field">
                      <label>Quantity per Pack</label>
                      <input name="quantity_per_pack" type="number" min="1" value={form.quantity_per_pack} onChange={handle} placeholder="e.g. 10" />
                    </div>
                  </div>
                  <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                   UN Code will be auto-generated on save.
                  </div>
                </>
              ) : (
                <div className="field">
                  <label>Update Quantity</label>
                  <input name="quantity" type="number" value={form.quantity} onChange={handle} placeholder="Enter new quantity" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Product' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Substitutes Modal */}
      {subModal && (
        <div className="modal-overlay" onClick={() => setSubModal(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Substitutes for: {subModal.original.name}</span>
              <button className="modal-close" onClick={() => setSubModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {subLoading ? (
                <div className="loading"><div className="spinner" /><span>Searching…</span></div>
              ) : subModal.substitutes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No substitutes found in your inventory. Consider ordering a replacement.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                    {subModal.substitutes.length} in-stock alternative{subModal.substitutes.length > 1 ? 's' : ''} found:
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th><th>Company</th><th>Stock</th><th>Price</th><th>Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subModal.substitutes.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                            <td>{s.company || <span className="muted">—</span>}</td>
                            <td className="mono green">{s.quantity}</td>
                            <td className="mono">₹{fmt(s.selling_price)}</td>
                            <td>
                              <span className={`badge ${s.match_reason === 'same_company' ? 'badge-amber' : 'badge-green'}`}>
                                {s.match_reason === 'same_company' ? 'Same Company' : 'Similar Name'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSubModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
