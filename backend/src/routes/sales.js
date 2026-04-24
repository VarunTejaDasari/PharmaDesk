const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT s.*, p.name as product_name
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE s.user_id = ?
       ORDER BY s.sale_date DESC`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { product_id, quantity_sold, sale_price, buyer_name, buyer_type, gst_percent, expiry_date } = req.body;
  try {
    const [[countRow]] = await db.query(
      'SELECT COUNT(*) as cnt FROM sales WHERE user_id = ?',
      [req.user.id]
    );
    const bill_number = String(countRow.cnt + 1).padStart(6, '0');

    await db.query(
      'INSERT INTO sales (user_id, product_id, quantity_sold, sale_price, buyer_name, buyer_type, gst_percent, expiry_date, bill_number) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, product_id, quantity_sold, sale_price, buyer_name, buyer_type, gst_percent || 0, expiry_date || null, bill_number]
    );
    await db.query(
      'UPDATE products SET quantity = quantity - ? WHERE id = ? AND user_id = ?',
      [quantity_sold, product_id, req.user.id]
    );
    res.json({ message: 'Sale recorded!', bill_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
