const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// GET /api/payments — list all pending/partial payments
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT pp.*,
              COALESCE(SUM(pt.amount), 0) AS paid_amount,
              (pp.total_amount - COALESCE(SUM(pt.amount), 0)) AS balance_due
       FROM pending_payments pp
       LEFT JOIN payment_transactions pt ON pt.payment_id = pp.id
       WHERE pp.user_id = ?
       GROUP BY pp.id
       ORDER BY pp.due_date ASC`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments — create a new pending payment record
router.post('/', async (req, res) => {
  const { party_name, party_type, total_amount, description, due_date } = req.body;
  // party_type: 'customer' (they owe us) or 'supplier' (we owe them)
  try {
    const [result] = await db.query(
      `INSERT INTO pending_payments
         (user_id, party_name, party_type, total_amount, description, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, party_name, party_type, total_amount, description, due_date]
    );
    res.json({ message: 'Payment record created!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/pay — record a partial or full payment
router.post('/:id/pay', async (req, res) => {
  const { amount, note } = req.body;
  const paymentId = req.params.id;

  try {
    // Verify ownership
    const [[payment]] = await db.query(
      'SELECT * FROM pending_payments WHERE id = ? AND user_id = ?',
      [paymentId, req.user.id]
    );
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Insert transaction
    await db.query(
      'INSERT INTO payment_transactions (payment_id, amount, note) VALUES (?, ?, ?)',
      [paymentId, amount, note || null]
    );

    // Recalculate balance and update status
    const [[totals]] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid FROM payment_transactions WHERE payment_id = ?',
      [paymentId]
    );

    const balance = payment.total_amount - totals.paid;
    const status = balance <= 0 ? 'paid' : 'partial';

    await db.query(
      'UPDATE pending_payments SET status = ? WHERE id = ?',
      [status, paymentId]
    );

    res.json({ message: 'Payment recorded!', balance_due: Math.max(0, balance), status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id — delete a payment record
router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM pending_payments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
