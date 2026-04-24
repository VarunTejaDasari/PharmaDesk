const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM products WHERE user_id = ? ORDER BY name',
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, quantity_per_pack, company, hsn_number } = req.body;
  try {
    const [[countRow]] = await db.query(
      'SELECT COUNT(*) as cnt FROM products WHERE user_id = ?',
      [req.user.id]
    );
    const nextCode = String(countRow.cnt + 1).padStart(6, '0');

    const [result] = await db.query(
      'INSERT INTO products (user_id, name, quantity, purchase_price, selling_price, company, quantity_per_pack, hsn_number, un_code) VALUES (?,?,0,0,0,?,?,?,?)',
      [req.user.id, name, company, quantity_per_pack || 1, hsn_number || '', nextCode]
    );
    res.json({ message: 'Product added!', id: result.insertId, un_code: nextCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { quantity } = req.body;
  try {
    await db.query(
      'UPDATE products SET quantity=? WHERE id=? AND user_id=?',
      [quantity, req.params.id, req.user.id]
    );
    res.json({ message: 'Product updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
