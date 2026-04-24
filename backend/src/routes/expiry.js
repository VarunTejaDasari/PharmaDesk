const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// GET /api/expiry — list all products with expiry info
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, company, quantity, expiry_date,
        DATEDIFF(expiry_date, CURDATE()) AS days_left
       FROM products
       WHERE user_id = ? AND expiry_date IS NOT NULL
       ORDER BY expiry_date ASC`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expiry/alerts — only expiring soon or already expired
router.get('/alerts', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, company, quantity, expiry_date,
        DATEDIFF(expiry_date, CURDATE()) AS days_left
       FROM products
       WHERE user_id = ?
         AND expiry_date IS NOT NULL
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY expiry_date ASC`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expiry/:id — set/update expiry date for a product
router.put('/:id', async (req, res) => {
  const { expiry_date } = req.body;
  try {
    await db.query(
      'UPDATE products SET expiry_date = ? WHERE id = ? AND user_id = ?',
      [expiry_date, req.params.id, req.user.id]
    );
    res.json({ message: 'Expiry date updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
