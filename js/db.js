'use strict';

// ─── In-memory cache (peuplé depuis l'API au démarrage) ───────
let db = { revenues: [], categories: [], expenses: [], expenseCategories: [], invoices: [], initialBalance: 0 };

// ─── Default categories (référence locale pour l'UI) ─────────
const DEFAULT_CATEGORIES = [
  { id: 'salary',     name: 'Salaire',         color: '#6366f1', icon: '💼' },
  { id: 'freelance',  name: 'Freelance',        color: '#8b5cf6', icon: '💻' },
  { id: 'investment', name: 'Investissements',  color: '#10b981', icon: '📈' },
  { id: 'rental',     name: 'Loyer reçu',       color: '#f59e0b', icon: '🏠' },
  { id: 'bonus',      name: 'Bonus / Prime',    color: '#ef4444', icon: '🎁' },
  { id: 'other',      name: 'Autre',            color: '#6b7280', icon: '📦' },
];

// ─── Helpers ──────────────────────────────────────────────────
function apiHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = data.error || JSON.stringify(data);
    } catch {
      msg = await res.text().catch(() => res.statusText);
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Load all data from API ───────────────────────────────────
async function loadDB() {
  try {
    const [revenues, categories, expenses, expenseCategories, invoices, balance] = await Promise.all([
      apiFetch('/api/revenues'),
      apiFetch('/api/categories'),
      apiFetch('/api/expenses'),
      apiFetch('/api/expense-categories'),
      apiFetch('/api/invoices'),
      apiFetch('/api/balance'),
    ]);
    db.revenues          = revenues;
    db.categories        = categories;
    db.expenses          = expenses;
    db.expenseCategories = expenseCategories;
    db.invoices          = invoices;
    db.initialBalance    = balance.initial_balance || 0;
  } catch (err) {
    console.error('loadDB error:', err);
    showToast('Impossible de charger les données', 'error');
  }
}

// ─── Balance ──────────────────────────────────────────────────
async function updateInitialBalance(amount) {
  const data = await apiFetch('/api/balance', {
    method:  'PUT',
    headers: apiHeaders(),
    body:    JSON.stringify({ initial_balance: amount }),
  });
  db.initialBalance = data.initial_balance;
}

// ─── Revenue CRUD ─────────────────────────────────────────────
async function addRevenue(data) {
  const entry = await apiFetch('/api/revenues', {
    method:  'POST',
    headers: apiHeaders(),
    body:    JSON.stringify(data),
  });
  db.revenues.unshift(entry);   // ajoute en tête (tri date desc)
  return entry;
}

async function updateRevenue(id, updates) {
  const updated = await apiFetch(`/api/revenues/${id}`, {
    method:  'PUT',
    headers: apiHeaders(),
    body:    JSON.stringify(updates),
  });
  const i = db.revenues.findIndex(r => r.id === id);
  if (i >= 0) db.revenues[i] = updated;
  return updated;
}

async function deleteRevenue(id) {
  await apiFetch(`/api/revenues/${id}`, { method: 'DELETE' });
  db.revenues = db.revenues.filter(r => r.id !== id);
}

// ─── Category CRUD ────────────────────────────────────────────
async function addCategory(data) {
  const cat = await apiFetch('/api/categories', {
    method:  'POST',
    headers: apiHeaders(),
    body:    JSON.stringify(data),
  });
  db.categories.push(cat);
  return cat;
}

async function updateCategory(id, updates) {
  const updated = await apiFetch(`/api/categories/${id}`, {
    method:  'PUT',
    headers: apiHeaders(),
    body:    JSON.stringify(updates),
  });
  const i = db.categories.findIndex(c => c.id === id);
  if (i >= 0) db.categories[i] = updated;
  return updated;
}

async function deleteCategory(id) {
  await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  db.categories = db.categories.filter(c => c.id !== id);
}

// ─── Expense Category CRUD ────────────────────────────────────
async function addExpenseCategory(data) {
  const cat = await apiFetch('/api/expense-categories', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.expenseCategories.push(cat);
  return cat;
}
async function updateExpenseCategory(id, updates) {
  const updated = await apiFetch(`/api/expense-categories/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.expenseCategories.findIndex(c => c.id === id);
  if (i >= 0) db.expenseCategories[i] = updated;
  return updated;
}
async function deleteExpenseCategory(id) {
  await apiFetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
  db.expenseCategories = db.expenseCategories.filter(c => c.id !== id);
}

// ─── Expense CRUD ─────────────────────────────────────────────
async function addExpense(data) {
  const entry = await apiFetch('/api/expenses', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.expenses.unshift(entry);
  return entry;
}
async function updateExpense(id, updates) {
  const updated = await apiFetch(`/api/expenses/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.expenses.findIndex(e => e.id === id);
  if (i >= 0) db.expenses[i] = updated;
  return updated;
}
async function deleteExpense(id) {
  await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
  db.expenses = db.expenses.filter(e => e.id !== id);
}

// ─── Invoice CRUD ─────────────────────────────────────────────
async function addInvoice(data) {
  const inv = await apiFetch('/api/invoices', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.invoices.unshift(inv);
  return inv;
}
async function updateInvoice(id, updates) {
  const updated = await apiFetch(`/api/invoices/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.invoices.findIndex(inv => inv.id === id);
  if (i >= 0) db.invoices[i] = updated;
  return updated;
}
async function deleteInvoice(id) {
  await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
  db.invoices = db.invoices.filter(inv => inv.id !== id);
}

// ─── Helpers ──────────────────────────────────────────────────
function getExpenseCategoryById(id) {
  return db.expenseCategories.find(c => c.id === id)
    || { name: id, color: '#94a3b8', icon: '?' };
}

// ─── Reset all data ───────────────────────────────────────────
async function resetAllData() {
  await apiFetch('/api/reset', { method: 'POST' });
  await loadDB();
}

// ─── Helper ───────────────────────────────────────────────────
function getCategoryById(id) {
  return db.categories.find(c => c.id === id)
    || { name: id, color: '#94a3b8', icon: '?' };
}
