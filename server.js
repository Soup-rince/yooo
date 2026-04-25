const express = require('express');
const cors = require('cors');
const path = require('path');
require('./loadEnv');

const receiptsRouter = require('./routes/receipts');
const shiftRouter = require('./routes/shift');
const baristaRouter = require('./routes/barista');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/barista', express.static(path.join(__dirname, 'barista-app')));

// Routes
app.use('/api/receipts', receiptsRouter);
app.use('/api/shift', shiftRouter);
app.use('/api/barista', baristaRouter);

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/barista', (req, res) => {
  res.sendFile(path.join(__dirname, 'barista-app', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Praf POS running on http://${HOST}:${PORT}`);
});
