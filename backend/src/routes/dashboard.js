const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/summary', async (req, res) => {
  const uid = req.user.id;
  try {
    const [[prod]] = await db.query(
      'SELECT COUNT(*) as total, SUM(quantity) as totalStock FROM products WHERE user_id = ?',
      [uid]
    );
    const [[sales]] = await db.query(
      `SELECT SUM(quantity_sold * sale_price) as dailySales, SUM(quantity_sold) as unitsSold
       FROM sales WHERE user_id = ? AND sale_date = CURDATE()`,
      [uid]
    );
    const [[purchases]] = await db.query(
      `SELECT SUM(quantity_purchased * purchase_price) as dailyPurchases
       FROM purchases WHERE user_id = ? AND purchase_date = CURDATE()`,
      [uid]
    );
    const [[margin]] = await db.query(
      `SELECT SUM(s.quantity_sold * (s.sale_price - p.purchase_price)) as margin
       FROM sales s JOIN products p ON s.product_id = p.id
       WHERE s.user_id = ? AND s.sale_date = CURDATE()`,
      [uid]
    );
    const [[monthlyMargin]] = await db.query(
      `SELECT SUM(s.quantity_sold * (s.sale_price - p.purchase_price)) as margin
       FROM sales s JOIN products p ON s.product_id = p.id
       WHERE s.user_id = ?
         AND MONTH(s.sale_date) = MONTH(CURDATE())
         AND YEAR(s.sale_date) = YEAR(CURDATE())`,
      [uid]
    );
    const [lowStock] = await db.query(
      'SELECT name, quantity FROM products WHERE user_id = ? AND quantity < 10 ORDER BY quantity ASC LIMIT 5',
      [uid]
    );

    res.json({
      totalProducts: prod.total,
      totalStock: prod.totalStock,
      dailySales: sales.dailySales || 0,
      unitsSold: sales.unitsSold || 0,
      dailyPurchases: purchases.dailyPurchases || 0,
      margin: margin.margin || 0,
      monthlyMargin: monthlyMargin.margin || 0,
      lowStock
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
