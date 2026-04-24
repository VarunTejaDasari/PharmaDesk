const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Generate a unique 8-char alphanumeric ID
function generateUniqueId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'MT-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ── REGISTER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });

  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already registered.' });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Generate unique ID (ensure no collision)
    let uniqueId;
    let taken = true;
    while (taken) {
      uniqueId = generateUniqueId();
      const [check] = await db.query('SELECT id FROM users WHERE unique_id = ?', [uniqueId]);
      taken = check.length > 0;
    }

    await db.query(
      'INSERT INTO users (unique_id, name, email, password) VALUES (?, ?, ?, ?)',
      [uniqueId, name, email, hashed]
    );

    res.status(201).json({ message: 'Registration successful!', uniqueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, uniqueId: user.unique_id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      uniqueId: user.unique_id,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
