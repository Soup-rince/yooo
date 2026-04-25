const API_BASE = window.location.origin;
const REFRESH_INTERVAL_MS = 10000;

let orders = [];
let historyReceipts = [];

async function apiGet(path) {
  const response = await fetch(API_BASE + path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function apiPost(path, body = {}) {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function formatTime(dateTime) {
  return new Date(dateTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDate(dateTime) {
  return new Date(dateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateTime(dateTime) {
  return `${formatDate(dateTime)} • ${formatTime(dateTime)}`;
}

function formatCurrency(value) {
  return `P${Number(value || 0).toFixed(2)}`;
}

function buildOrderFromReceipt(receipt) {
  const items = receipt.items || [];
  if (!items.length) {
    return null;
  }

  const totalItemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return {
    id: receipt.id,
    code: receipt.receipt_num,
    createdAt: receipt.created_at,
    createdAtText: formatDateTime(receipt.created_at),
    completedAt: receipt.completed_at || null,
    completedAtText: receipt.completed_at ? formatDateTime(receipt.completed_at) : null,
    method: receipt.method,
    total: Number(receipt.total || 0),
    totalItemCount,
    items: items.map((item) => ({
      name: item.name,
      category: item.category,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0)
    }))
  };
}

function summaryData() {
  const totalReceipts = orders.length;
  const totalUnits = orders.reduce((sum, order) => sum + order.totalItemCount, 0);
  const cashReceipts = orders.filter((order) => order.method === 'Cash').length;

  return [
    { label: 'Pending Receipts', value: totalReceipts },
    { label: 'Total Units', value: totalUnits },
    { label: 'Cash Receipts', value: cashReceipts }
  ];
}

function renderSummary() {
  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = summaryData()
    .map(
      (stat) => `
        <div class="stat-card">
          <span>${stat.label}</span>
          <strong>${stat.value}</strong>
        </div>
      `
    )
    .join('');

  document.getElementById('activeOrdersChip').textContent = `${orders.length} receipt${orders.length === 1 ? '' : 's'}`;
}

function renderReceiptSections(order) {
  const lineItems = order.items
    .map(
      (item) => `
        <div class="receipt-line">
          <div>
            <div class="receipt-line-main">${item.name}</div>
            <div class="receipt-line-meta">${item.category} • ${formatCurrency(item.price)} each</div>
          </div>
          <div class="receipt-line-qty">
            <div>x${item.qty}</div>
            <div class="receipt-line-total">${formatCurrency(item.price * item.qty)}</div>
          </div>
        </div>
      `
    )
    .join('');

  return `
    <div class="order-section">
      <span class="order-section-label">Receipt Items</span>
      <div class="receipt-rule"></div>
      <div class="receipt-lines">
        ${lineItems}
      </div>
      <div class="receipt-rule"></div>
      <div class="receipt-summary">
        <span>Payment</span>
        <span>${order.method}</span>
      </div>
      <div class="receipt-summary">
        <span>Units</span>
        <span>${order.totalItemCount}</span>
      </div>
      <div class="receipt-summary total">
        <span>Total</span>
        <span>${formatCurrency(order.total)}</span>
      </div>
    </div>
  `;
}

function renderWall() {
  const wall = document.getElementById('receiptWall');

  if (!orders.length) {
    wall.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>No pending receipts</strong>
          <p>Paid receipts will appear here automatically until the barista marks them done.</p>
        </div>
      </div>
    `;
    return;
  }

  wall.innerHTML = orders
    .map(
      (order) => `
        <article class="order-card receipt-card">
          <div class="order-top">
            <div>
              <p class="order-code">${order.code}</p>
              <h4 class="order-name">Barista Copy</h4>
            </div>
            <span class="receipt-stamp">Live View</span>
          </div>
          <p class="order-meta">${order.createdAtText}</p>
          <p class="order-meta">Receipt ${order.code} • ${order.method}</p>
          ${renderReceiptSections(order)}
          <div class="receipt-actions">
            <button class="done-btn" type="button" onclick="markReceiptDone(${order.id}, '${order.code}')">Done</button>
          </div>
        </article>
      `
    )
    .join('');
}

function renderHistory() {
  const wall = document.getElementById('historyWall');
  document.getElementById('historyCount').textContent = historyReceipts.length;

  if (!historyReceipts.length) {
    wall.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>No completed receipts yet</strong>
          <p>Done receipts will appear here so the barista can double-check them later.</p>
        </div>
      </div>
    `;
    return;
  }

  wall.innerHTML = historyReceipts
    .map(
      (order) => `
        <article class="order-card history-card">
          <div class="order-top">
            <div>
              <p class="order-code">${order.code}</p>
              <h4 class="order-name">Completed Receipt</h4>
            </div>
            <span class="receipt-stamp done">Done</span>
          </div>
          <p class="order-meta">Completed ${order.completedAtText || order.createdAtText}</p>
          <p class="order-meta">Original ${order.createdAtText}</p>
          <p class="order-meta">Receipt ${order.code} • ${order.method}</p>
          ${renderReceiptSections(order)}
        </article>
      `
    )
    .join('');
}

function renderError(message) {
  document.getElementById('receiptWall').innerHTML = `
    <div class="inline-error">${message}</div>
  `;
  document.getElementById('historyWall').innerHTML = '';
  document.getElementById('historyCount').textContent = '0';
  document.getElementById('activeOrdersChip').textContent = '0 receipts';
  document.getElementById('summaryGrid').innerHTML = '';
}

async function loadOrders() {
  try {
    const [pendingReceipts, history] = await Promise.all([
      apiGet('/api/barista/receipts'),
      apiGet('/api/barista/receipts/history')
    ]);

    orders = pendingReceipts
      .map(buildOrderFromReceipt)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    historyReceipts = history
      .map(buildOrderFromReceipt)
      .filter(Boolean)
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

    renderSummary();
    renderWall();
    renderHistory();
  } catch (error) {
    console.error(error);
    renderError('Failed to load live receipts from the POS app.');
  }
}

async function markReceiptDone(id, code) {
  const confirmed = window.confirm(`Mark receipt ${code} as done?`);
  if (!confirmed) {
    return;
  }

  try {
    await apiPost(`/api/barista/receipts/${id}/done`);
    await loadOrders();
  } catch (error) {
    console.error(error);
    window.alert(`Failed to mark receipt ${code} as done.`);
  }
}

loadOrders();
setInterval(loadOrders, REFRESH_INTERVAL_MS);
