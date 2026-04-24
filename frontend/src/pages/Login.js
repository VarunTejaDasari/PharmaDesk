import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('https://pharmadesk-ijjj.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed.');

      // Save token + user info
      localStorage.setItem('mt_token', data.token);
      localStorage.setItem('mt_uid', data.uniqueId);
      localStorage.setItem('mt_name', data.name);

      // Redirect to /:uniqueId/products
      navigate(`/${data.uniqueId}/products`);
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">✚</span>
          <span className="brand-name">MediTrack</span>
        </div>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-sub">Login to your MediTrack account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label>Email</label>
            <input
              type="email" name="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" name="password" placeholder="Your password"
              value={form.password} onChange={handleChange} required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
