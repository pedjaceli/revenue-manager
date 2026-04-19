'use strict';

// ─── In-memory cache (peuplé depuis l'API au démarrage) ───────
let db = { expenses: [], expenseCategories: [], invoices: [], shoppingLists: [], inventory: [], stores: [], priceRecords: [], initialBalance: 0 };

// ─── Default categories (référence locale pour l'UI) ─────────
const DEFAULT_CATEGORIES = [
  { id: 'grocery',   name: 'Épicerie',          color: '#6366f1', icon: '🛒' },
  { id: 'bakery',    name: 'Boulangerie',        color: '#8b5cf6', icon: '🥖' },
  { id: 'produce',   name: 'Fruits & Légumes',   color: '#10b981', icon: '🥦' },
  { id: 'meat',      name: 'Boucherie',          color: '#ef4444', icon: '🥩' },
  { id: 'household', name: 'Produits ménagers',  color: '#f59e0b', icon: '🧹' },
  { id: 'other',     name: 'Autre',              color: '#6b7280', icon: '📦' },
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
    const [expenses, expenseCategories, invoices, shoppingLists, inventory, stores, priceRecords, balance] = await Promise.all([
      apiFetch('/api/expenses'),
      apiFetch('/api/expense-categories'),
      apiFetch('/api/invoices'),
      apiFetch('/api/shopping-lists'),
      apiFetch('/api/inventory'),
      apiFetch('/api/stores'),
      apiFetch('/api/price-records'),
      apiFetch('/api/balance'),
    ]);
    db.expenses          = expenses;
    db.expenseCategories = expenseCategories;
    db.invoices          = invoices;
    db.shoppingLists     = shoppingLists;
    db.inventory         = inventory;
    db.stores            = stores;
    db.priceRecords      = priceRecords;
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

// ─── Shopping List CRUD ───────────────────────────────────────
async function addShoppingList(data) {
  const sl = await apiFetch('/api/shopping-lists', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.shoppingLists.unshift(sl);
  return sl;
}
async function updateShoppingList(id, updates) {
  const updated = await apiFetch(`/api/shopping-lists/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.shoppingLists.findIndex(sl => sl.id === id);
  if (i >= 0) db.shoppingLists[i] = updated;
  return updated;
}
async function deleteShoppingList(id) {
  await apiFetch(`/api/shopping-lists/${id}`, { method: 'DELETE' });
  db.shoppingLists = db.shoppingLists.filter(sl => sl.id !== id);
}

// ─── Shopping List Item CRUD ──────────────────────────────────
async function addShoppingListItem(listId, data) {
  const item = await apiFetch(`/api/shopping-lists/${listId}/items`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  const sl = db.shoppingLists.find(s => s.id === listId);
  if (sl) sl.items.push(item);
  return item;
}
async function updateShoppingListItem(id, updates) {
  const updated = await apiFetch(`/api/shopping-list-items/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  for (const sl of db.shoppingLists) {
    const i = sl.items.findIndex(it => it.id === id);
    if (i >= 0) { sl.items[i] = updated; break; }
  }
  return updated;
}
async function deleteShoppingListItem(id) {
  await apiFetch(`/api/shopping-list-items/${id}`, { method: 'DELETE' });
  for (const sl of db.shoppingLists) {
    sl.items = sl.items.filter(it => it.id !== id);
  }
}

// ─── Store CRUD ───────────────────────────────────────────────
async function addStore(data) {
  const s = await apiFetch('/api/stores', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.stores.push(s);
  db.stores.sort((a, b) => a.name.localeCompare(b.name));
  return s;
}
async function updateStore(id, updates) {
  const updated = await apiFetch(`/api/stores/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.stores.findIndex(s => s.id === id);
  if (i >= 0) db.stores[i] = updated;
  return updated;
}
async function deleteStore(id) {
  await apiFetch(`/api/stores/${id}`, { method: 'DELETE' });
  db.stores        = db.stores.filter(s => s.id !== id);
  db.priceRecords  = db.priceRecords.filter(r => r.store_id !== id);
}

// ─── Price Record CRUD ────────────────────────────────────────
async function addPriceRecord(data) {
  const rec = await apiFetch('/api/price-records', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.priceRecords.unshift(rec);
  return rec;
}
async function updatePriceRecord(id, updates) {
  const updated = await apiFetch(`/api/price-records/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.priceRecords.findIndex(r => r.id === id);
  if (i >= 0) db.priceRecords[i] = updated;
  return updated;
}
async function deletePriceRecord(id) {
  await apiFetch(`/api/price-records/${id}`, { method: 'DELETE' });
  db.priceRecords = db.priceRecords.filter(r => r.id !== id);
}

// ─── Inventory CRUD ───────────────────────────────────────────
async function addInventoryItem(data) {
  const item = await apiFetch('/api/inventory', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(data) });
  db.inventory.push(item);
  return item;
}
async function updateInventoryItem(id, updates) {
  const updated = await apiFetch(`/api/inventory/${id}`, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(updates) });
  const i = db.inventory.findIndex(it => it.id === id);
  if (i >= 0) db.inventory[i] = updated;
  return updated;
}
async function deleteInventoryItem(id) {
  await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
  db.inventory = db.inventory.filter(it => it.id !== id);
}

// ─── Reset all data ───────────────────────────────────────────
async function resetAllData() {
  await apiFetch('/api/reset', { method: 'POST' });
  await loadDB();
}

