-- Run this in your NeonDB SQL editor

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  receipt_num TEXT NOT NULL UNIQUE,
  total NUMERIC(10, 2) NOT NULL,
  method TEXT NOT NULL,
  cash_given NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  qty INT NOT NULL
);

CREATE TABLE IF NOT EXISTS barista_receipts (
  receipt_id INT PRIMARY KEY REFERENCES receipts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_created_at
  ON receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id
  ON receipt_items (receipt_id);

CREATE INDEX IF NOT EXISTS idx_barista_receipts_status
  ON barista_receipts (status);
