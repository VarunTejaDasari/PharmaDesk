const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// Seasonal trend factors (month 1-12)
// Higher values in flu/dengue/monsoon months common in India
const SEASONAL_FACTORS = {
  1:  1.10,  // Jan — cold/flu
  2:  1.05,
  3:  1.00,
  4:  0.95,
  5:  0.95,
  6:  1.10,  // Jun — monsoon starts, dengue
  7:  1.20,  // Jul — peak monsoon
  8:  1.20,  // Aug — peak monsoon / dengue
  9:  1.10,  // Sep — post-monsoon illness
  10: 1.00,
  11: 1.05,
  12: 1.15,  // Dec — cold/flu season
};

// GET /api/forecast — predict next month's demand for each product
router.get('/', async (req, res) => {
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const forecastMonth = nextMonth.getMonth() + 1; // 1-12
    const trendFactor = SEASONAL_FACTORS[forecastMonth] || 1.0;

    // Avg monthly sales over last 3 months per product
    const [sales] = await db.query(
      `SELECT
         p.id,
         p.name,
         p.company,
         p.quantity AS current_stock,
         COALESCE(SUM(s.quantity_sold), 0) AS total_sold_3mo,
         COUNT(DISTINCT DATE_FORMAT(s.sale_date, '%Y-%m')) AS active_months
       FROM products p
       LEFT JOIN sales s
         ON s.product_id = p.id
         AND s.user_id = p.user_id
         AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       WHERE p.user_id = ?
       GROUP BY p.id, p.name, p.company, p.quantity`,
      [req.user.id]
    );

    const forecast = sales.map(row => {
      const months = Math.max(row.active_months, 1);
      const avgMonthly = row.total_sold_3mo / months;
      const predicted = Math.round(avgMonthly * trendFactor);
      const shortfall = Math.max(0, predicted - row.current_stock);
      return {
        id: row.id,
        name: row.name,
        company: row.company,
        current_stock: row.current_stock,
        avg_monthly_sales: Math.round(avgMonthly),
        trend_factor: trendFactor,
        predicted_demand: predicted,
        shortfall,
        recommendation: shortfall > 0
          ? `Order at least ${shortfall} units`
          : 'Stock is sufficient',
      };
    });

    // Sort by shortfall descending — most urgent first
    forecast.sort((a, b) => b.shortfall - a.shortfall);

    res.json({
      forecast_month: nextMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      trend_factor: trendFactor,
      items: forecast,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
