'use strict';

// ─── In-memory cache (peuplé depuis l'API au démarrage) ───────
let db = { revenues: [], categories: [] };

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
    const [revenues, categories] = await Promise.all([
      apiFetch('/api/revenues'),
      apiFetch('/api/categories'),
    ]);
    db.revenues   = revenues;
    db.categories = categories;
  } catch (err) {
    console.error('loadDB error:', err);
    showToast('Impossible de charger les données', 'error');
  }
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
