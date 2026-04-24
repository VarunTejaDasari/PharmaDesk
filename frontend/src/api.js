const BASE = 'http://127.0.0.1:5000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('mt_token') || ''}`
});

const get    = (path)       => fetch(`${BASE}${path}`, { headers: authHeaders() }).then(r => r.json());
const post   = (path, body) => fetch(`${BASE}${path}`, { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
const put    = (path, body) => fetch(`${BASE}${path}`, { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
const del    = (path)       => fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

export const api = {
  // Existing
  getDashboard:  () => get('/dashboard/summary'),
  getProducts:   () => get('/products'),
  addProduct:    (d) => post('/products', d),
  updateProduct: (id, d) => put(`/products/${id}`, d),
  getSales:      () => get('/sales'),
  addSale:       (d) => post('/sales', d),
  getPurchases:  () => get('/purchases'),
  addPurchase:   (d) => post('/purchases', d),

  //  New generic helpers used by new pages
  get,
  post,
  put,
  delete: del,
};
