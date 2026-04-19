'use strict';

// ─── Bootstrap modal instances (set in app.js after DOM ready) ─
let bsRevenueModal, bsCategoryModal, bsConfirmModal;
let bsInvModal, bsListModal, bsItemModal, bsScanModal;

// ─── Wake Lock ────────────────────────────────────────────────
let _wakeLock = null;

async function toggleWakeLock(enabled) {
  if (!('wakeLock' in navigator)) {
    showToast(t('settings_wake_lock_err'), 'error');
    document.getElementById('wakeLockToggle').checked = false;
    return;
  }
  if (enabled) {
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => {
        _wakeLock = null;
        const tog = document.getElementById('wakeLockToggle');
        if (tog) tog.checked = false;
      });
    } catch {
      showToast(t('settings_wake_lock_err'), 'error');
      document.getElementById('wakeLockToggle').checked = false;
    }
  } else {
    if (_wakeLock) { await _wakeLock.release(); _wakeLock = null; }
  }
}

// Réacquérir le wake lock si l'onglet redevient visible
document.addEventListener('visibilitychange', async () => {
  const tog = document.getElementById('wakeLockToggle');
  if (tog && tog.checked && document.visibilityState === 'visible') {
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* silencieux */ }
  }
});

// ─── Current page ─────────────────────────────────────────────
let currentPage = 'dashboard';

// ─── Navigation ───────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  // Fermer la sidebar sur mobile après navigation
  if (window.innerWidth < 992) closeSidebar();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  const titles = {
    dashboard:  'Dashboard',
    budget:     t('nav_revenues'),
    charts:     t('nav_charts'),
    categories: t('nav_categories'),
    shopping:   t('nav_shopping'),
    inventory:  t('nav_inventory'),
    depenses:   t('nav_depenses'),
    export:     t('nav_export'),
    settings:   t('nav_settings'),
    users:      t('nav_users'),
  };
  document.getElementById('page-title').textContent = titles[page] || '';
  document.getElementById('btn-add-budget').classList.toggle('d-none', page !== 'budget');

  if (page === 'dashboard')  renderDashboard();
  if (page === 'budget')     renderRevenueList();
  if (page === 'charts')     renderCharts();
  if (page === 'categories') renderCategoryList();
  if (page === 'inventory')  renderInventory();
  if (page === 'shopping')   renderShoppingLists();
  if (page === 'depenses')   renderDepenses();
  if (page === 'export')     renderExportSummary();
  if (page === 'users')      renderUsers();
}

function refreshCurrentPage() {
  navigate(currentPage);
}

// ─── Sidebar mobile (hamburger) ───────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isOpen   = sidebar.classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.body.style.overflow = '';
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
  document.getElementById('revenueModalTitle').textContent = t('modal_add_revenue');
  document.getElementById('revenueSubmitBtn').textContent  = t('btn_save');
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
  document.getElementById('revenueModalTitle').textContent = t('modal_edit_revenue');
  document.getElementById('revenueSubmitBtn').textContent  = t('btn_update');
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

// ─── Swatch color picker ──────────────────────────────────────
function setSwatchColor(pickerId, color) {
  const picker = document.getElementById(pickerId);
  picker.previousElementSibling.value = color;
  picker.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color === color)
  );
}

// ─── Category Modal ───────────────────────────────────────────
let editingCategoryId = null;

function openAddCategoryModal() {
  editingCategoryId = null;
  document.getElementById('categoryModalTitle').textContent = t('modal_add_category');
  document.getElementById('categorySubmitBtn').textContent  = t('btn_create');
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-icon').value = '💼';
  setSwatchColor('cf-swatch', '#6366f1');
  clearCategoryErrors();
  bsCategoryModal.show();
}

function openEditCategoryModal(id) {
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  document.getElementById('categoryModalTitle').textContent = t('modal_edit_category');
  document.getElementById('categorySubmitBtn').textContent  = t('btn_update');
  document.getElementById('cf-name').value = c.name;
  document.getElementById('cf-icon').value = c.icon;
  setSwatchColor('cf-swatch', c.color);
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
