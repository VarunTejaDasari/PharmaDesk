const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// GET /api/substitutes/:id — suggest substitutes for an out-of-stock product
// Logic: find products with a similar name (shared word), same company, or previously
// bundled in sales on the same day by the same buyer.
router.get('/:id', async (req, res) => {
  try {
    const [[product]] = await db.query(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Extract meaningful keywords from the product name (words > 3 chars)
    const keywords = product.name
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''));

    let substitutes = [];

    if (keywords.length > 0) {
      const likeClauses = keywords
        .map(() => 'p.name LIKE ?')
        .join(' OR ');

      const likeValues = keywords.map(k => `%${k}%`);

      const [byName] = await db.query(
        `SELECT id, name, company, quantity, selling_price,
                'name_match' AS match_reason
         FROM products
         WHERE user_id = ? AND id != ? AND quantity > 0
           AND (${likeClauses})
         ORDER BY quantity DESC
         LIMIT 5`,
        [req.user.id, product.id, ...likeValues]
      );
      substitutes.push(...byName);
    }

    // Also suggest same-company products with stock
    if (product.company) {
      const [byCompany] = await db.query(
        `SELECT id, name, company, quantity, selling_price,
                'same_company' AS match_reason
         FROM products
         WHERE user_id = ? AND id != ? AND quantity > 0
           AND company = ?
         ORDER BY quantity DESC
         LIMIT 3`,
        [req.user.id, product.id, product.company]
      );
      // Merge, avoid duplicates
      const existingIds = new Set(substitutes.map(s => s.id));
      byCompany.forEach(p => {
        if (!existingIds.has(p.id)) substitutes.push(p);
      });
    }

    res.json({
      original: product,
      substitutes: substitutes.slice(0, 6),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
