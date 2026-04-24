const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT p.*, pr.name as product_name
       FROM purchases p
       JOIN products pr ON p.product_id = pr.id
       WHERE p.user_id = ?
       ORDER BY p.purchase_date DESC`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { product_id, quantity_purchased, purchase_price, supplier_name, gst_percent, expiry_date, hsn_code } = req.body;
  try {
    await db.query(
      'INSERT INTO purchases (user_id, product_id, quantity_purchased, purchase_price, supplier_name, gst_percent, expiry_date, hsn_code) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, product_id, quantity_purchased, purchase_price, supplier_name, gst_percent || 0, expiry_date || null, hsn_code || '']
    );
    await db.query(
      'UPDATE products SET quantity = quantity + ? WHERE id = ? AND user_id = ?',
      [quantity_purchased, product_id, req.user.id]
    );
    res.json({ message: 'Purchase recorded!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
