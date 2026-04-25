const express = require('express');
const router = express.Router();
const pool = require('../db');

const ALLOWED_METHODS = new Set(['Cash', 'GCash']);

const RECEIPTS_WITH_ITEMS_QUERY = `
  SELECT
    r.*,
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
  LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
`;

function parseMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const normalizedItems = items
    .map((item) => ({
      name: typeof item?.name === 'string' ? item.name.trim() : '',
      category: typeof item?.category === 'string' ? item.category.trim() : '',
      price: parseMoney(item?.price),
      qty: Number(item?.qty)
    }))
    .filter((item) =>
      item.name &&
      item.category &&
      Number.isFinite(item.price) &&
      item.price >= 0 &&
      Number.isInteger(item.qty) &&
      item.qty > 0
    );

  return normalizedItems.length ? normalizedItems : null;
}

function calculateTotal(items) {
  return Number(
    items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2)
  );
}

async function fetchReceipts(client = pool, whereClause = '', params = []) {
  const query = `
    ${RECEIPTS_WITH_ITEMS_QUERY}
    ${whereClause}
    GROUP BY r.id
    ORDER BY r.created_at DESC, r.id DESC
  `;

  const result = await client.query(query, params);
  return result.rows;
}

// Get all receipts with their items
router.get('/', async (req, res) => {
  try {
    const receipts = await fetchReceipts();
    res.json(receipts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Create a new receipt
router.post('/', async (req, res) => {
  const { method, cash_given, items } = req.body;
  const normalizedItems = normalizeItems(items);

  if (!normalizedItems) {
    return res.status(400).json({ error: 'Receipt must include at least one valid item' });
  }

  if (normalizedItems.length !== items.length) {
    return res.status(400).json({ error: 'Receipt contains one or more invalid line items' });
  }

  if (!ALLOWED_METHODS.has(method)) {
    return res.status(400).json({ error: 'Unsupported payment method' });
  }

  const computedTotal = calculateTotal(normalizedItems);
  const parsedCashGiven = cash_given == null ? null : parseMoney(cash_given);

  if (method === 'Cash') {
    if (!Number.isFinite(parsedCashGiven)) {
      return res.status(400).json({ error: 'Cash payments require a valid cash amount' });
    }

    if (parsedCashGiven < computedTotal) {
      return res.status(400).json({ error: 'Cash given cannot be less than the total amount' });
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const receiptResult = await client.query(
      `
        WITH next_receipt AS (
          SELECT nextval(pg_get_serial_sequence('receipts', 'id')) AS id
        )
        INSERT INTO receipts (id, receipt_num, total, method, cash_given)
        SELECT
          id,
          'R-' || lpad(id::text, 4, '0'),
          $1,
          $2,
          $3
        FROM next_receipt
        RETURNING *
      `,
      [
        computedTotal,
        method,
        method === 'Cash' ? parsedCashGiven : null
      ]
    );

    const receipt = receiptResult.rows[0];

    for (const item of normalizedItems) {
      await client.query(
        'INSERT INTO receipt_items (receipt_id, name, category, price, qty) VALUES ($1, $2, $3, $4, $5)',
        [receipt.id, item.name, item.category, item.price, item.qty]
      );
    }

    const [savedReceipt] = await fetchReceipts(client, 'WHERE r.id = $1', [receipt.id]);

    await client.query('COMMIT');

    res.status(201).json({ success: true, receipt: savedReceipt });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create receipt' });
  } finally {
    client.release();
  }
});

// Get a single receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const receipts = await fetchReceipts(pool, 'WHERE r.id = $1', [req.params.id]);
    const receipt = receipts[0];

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

module.exports = router;
