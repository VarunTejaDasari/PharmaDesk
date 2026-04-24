import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res = await fetch('https://pharmadesk-ijjj.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Registration failed.');
      setSuccess(data.uniqueId);
      setTimeout(() => navigate('/login'), 3000);
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
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-sub">Register to access your MediTrack dashboard</p>

        {success ? (
          <div className="auth-success">
            <div className="success-icon">✓</div>
            <p>Registration successful!</p>
            <div className="uid-box">
              Your Unique ID: <span className="uid">{success}</span>
            </div>
            <p className="auth-redirect">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="field">
              <label>Full Name</label>
              <input
                type="text" name="name" placeholder="Your name"
                value={form.name} onChange={handleChange} required
              />
            </div>
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
                type="password" name="password" placeholder="Min. 6 characters"
                value={form.password} onChange={handleChange} required
              />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password" name="confirm" placeholder="Repeat password"
                value={form.confirm} onChange={handleChange} required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Register'}
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
