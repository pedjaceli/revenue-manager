'use strict';

// ─── Bootstrap modal instances (set in app.js after DOM ready) ─
let bsRevenueModal, bsCategoryModal, bsConfirmModal;

// ─── Current page ─────────────────────────────────────────────
let currentPage = 'dashboard';

// ─── Navigation ───────────────────────────────────────────────
function navigate(page) {
  currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  const titles = {
    dashboard:  'Dashboard',
    revenues:   'Revenus',
    charts:     'Graphiques',
    categories: 'Catégories',
    export:     'Export',
  };
  document.getElementById('page-title').textContent = titles[page] || '';

  if (page === 'dashboard')  renderDashboard();
  if (page === 'revenues')   renderRevenueList();
  if (page === 'charts')     renderCharts();
  if (page === 'categories') renderCategoryList();
  if (page === 'export')     renderExportSummary();
}

function refreshCurrentPage() {
  navigate(currentPage);
}

// ─── Toast (Bootstrap Toast) ──────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  const bgClass = type === 'success' ? 'text-bg-dark' : 'text-bg-danger';
  const icon    = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';

  el.className = `toast align-items-center ${bgClass} border-0`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icon}"></i> ${escHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;

  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { autohide: true, delay: 3000 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ─── Revenue Modal ────────────────────────────────────────────
let editingRevenueId = null;

function openAddModal() {
  editingRevenueId = null;
  document.getElementById('revenueModalTitle').textContent = 'Ajouter un revenu';
  document.getElementById('revenueSubmitBtn').textContent  = 'Enregistrer';
  document.getElementById('f-amount').value = '';
  document.getElementById('f-date').value   = new Date().toISOString().slice(0, 10);
  document.getElementById('f-desc').value   = '';
  document.getElementById('f-notes').value  = '';
  clearRevenueErrors();
  populateCategorySelect('f-cat', null);
  bsRevenueModal.show();
}

function openEditModal(id) {
  const r = db.revenues.find(x => x.id === id);
  if (!r) return;
  editingRevenueId = id;
  document.getElementById('revenueModalTitle').textContent = 'Modifier le revenu';
  document.getElementById('revenueSubmitBtn').textContent  = 'Mettre à jour';
  document.getElementById('f-amount').value = r.amount;
  document.getElementById('f-date').value   = r.date;
  document.getElementById('f-desc').value   = r.description;
  document.getElementById('f-notes').value  = r.notes || '';
  clearRevenueErrors();
  populateCategorySelect('f-cat', r.category);
  bsRevenueModal.show();
}

function clearRevenueErrors() {
  ['amount', 'date', 'desc', 'cat'].forEach(f => {
    const input = document.getElementById('f-' + f);
    const err   = document.getElementById('e-' + f);
    if (input) input.classList.remove('is-invalid');
    if (err)   err.textContent = '';
  });
}

function setFieldError(field, msg) {
  const input = document.getElementById('f-' + field);
  const err   = document.getElementById('e-' + field);
  if (input) input.classList.add('is-invalid');
  if (err)   err.textContent = msg;
}

function populateCategorySelect(selectId, selected) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = db.categories.map(c =>
    `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>
      ${c.icon} ${escHtml(c.name)}
    </option>`
  ).join('');
}

// ─── Category Modal ───────────────────────────────────────────
let editingCategoryId = null;

function openAddCategoryModal() {
  editingCategoryId = null;
  document.getElementById('categoryModalTitle').textContent = 'Nouvelle catégorie';
  document.getElementById('categorySubmitBtn').textContent  = 'Créer';
  document.getElementById('cf-name').value  = '';
  document.getElementById('cf-icon').value  = '💼';
  document.getElementById('cf-color').value = '#6366f1';
  clearCategoryErrors();
  bsCategoryModal.show();
}

function openEditCategoryModal(id) {
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  document.getElementById('categoryModalTitle').textContent = 'Modifier la catégorie';
  document.getElementById('categorySubmitBtn').textContent  = 'Mettre à jour';
  document.getElementById('cf-name').value  = c.name;
  document.getElementById('cf-icon').value  = c.icon;
  document.getElementById('cf-color').value = c.color;
  clearCategoryErrors();
  bsCategoryModal.show();
}

function clearCategoryErrors() {
  const input = document.getElementById('cf-name');
  const err   = document.getElementById('ce-name');
  input.classList.remove('is-invalid');
  err.textContent = '';
}

// ─── Confirm Delete ───────────────────────────────────────────
function confirmDelete(message, onConfirm) {
  document.getElementById('confirmText').textContent = message;
  document.getElementById('confirmOkBtn').onclick = () => {
    onConfirm();
    bsConfirmModal.hide();
  };
  bsConfirmModal.show();
}
