const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get shift summary (all receipts grouped by payment method)
router.get('/', async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        COUNT(*) AS total_receipts,
        SUM(total) AS gross_sales,
        SUM(CASE WHEN method = 'Cash' THEN total ELSE 0 END) AS cash_total,
        SUM(CASE WHEN method = 'GCash' THEN total ELSE 0 END) AS gcash_total,
        COUNT(CASE WHEN method = 'Cash' THEN 1 END) AS cash_count,
        COUNT(CASE WHEN method = 'GCash' THEN 1 END) AS gcash_count
      FROM receipts
    `);

    const receipts = await pool.query(
      'SELECT * FROM receipts ORDER BY created_at DESC'
    );

    res.json({
      summary: summary.rows[0],
      receipts: receipts.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shift data' });
  }
});

module.exports = router;
