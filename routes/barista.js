const express = require('express');
const router = express.Router();
const pool = require('../db');

const BARISTA_RECEIPTS_QUERY = `
  SELECT
    r.id,
    r.receipt_num,
    r.total,
    r.method,
    r.created_at,
    COALESCE(br.status, 'pending') AS barista_status,
    br.completed_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ri.id,
          'receipt_id', ri.receipt_id,
          'name', ri.name,
          'category', ri.category,
          'price', ri.price,
          'qty', ri.qty
        )
        ORDER BY ri.id
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM receipts r
  LEFT JOIN barista_receipts br ON br.receipt_id = r.id
  LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
  WHERE COALESCE(br.status, 'pending') <> 'done'
  GROUP BY r.id, br.status, br.completed_at
  ORDER BY r.created_at DESC, r.id DESC
`;

const BARISTA_HISTORY_QUERY = `
  SELECT
    r.id,
    r.receipt_num,
    r.total,
    r.method,
    r.created_at,
    br.status AS barista_status,
    br.completed_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ri.id,
          'receipt_id', ri.receipt_id,
          'name', ri.name,
          'category', ri.category,
          'price', ri.price,
          'qty', ri.qty
        )
        ORDER BY ri.id
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM barista_receipts br
  JOIN receipts r ON r.id = br.receipt_id
  LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
  WHERE br.status = 'done'
  GROUP BY r.id, br.status, br.completed_at
  ORDER BY br.completed_at DESC NULLS LAST, r.created_at DESC, r.id DESC
  LIMIT 25
`;

router.get('/receipts', async (req, res) => {
  try {
    const result = await pool.query(BARISTA_RECEIPTS_QUERY);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load barista receipts' });
  }
});

router.get('/receipts/history', async (req, res) => {
  try {
    const result = await pool.query(BARISTA_HISTORY_QUERY);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load barista receipt history' });
  }
});

router.post('/receipts/:receiptId/done', async (req, res) => {
  const receiptId = Number(req.params.receiptId);

  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: 'Invalid receipt id' });
  }

  try {
    const receipt = await pool.query(
      'SELECT id, receipt_num FROM receipts WHERE id = $1',
      [receiptId]
    );

    if (!receipt.rows.length) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const result = await pool.query(
      `
        INSERT INTO barista_receipts (receipt_id, status, completed_at, updated_at)
        VALUES ($1, 'done', NOW(), NOW())
        ON CONFLICT (receipt_id)
        DO UPDATE SET
          status = 'done',
          completed_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `,
      [receiptId]
    );

    res.json({
      success: true,
      receipt: receipt.rows[0],
      barista_receipt: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark receipt as done' });
  }
});

module.exports = router;
