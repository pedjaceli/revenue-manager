'use strict';

// ─── Bootstrap modal instances (set in app.js after DOM ready) ─
let bsConfirmModal;
let bsPriceModal, bsStoreModal, bsInvModal, bsListModal, bsItemModal, bsScanModal;

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
    charts:     t('nav_charts'),
    shopping:   t('nav_shopping'),
    prices:     t('nav_prices'),
    inventory:  t('nav_inventory'),
    depenses:   t('nav_depenses'),
    export:     t('nav_export'),
    settings:   t('nav_settings'),
    users:      t('nav_users'),
  };
  document.getElementById('page-title').textContent = titles[page] || '';

  if (page === 'dashboard')  renderDashboard();
  if (page === 'charts')     renderCharts();
  if (page === 'prices')     renderPrices();
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


// ─── Swatch color picker ──────────────────────────────────────
function setSwatchColor(pickerId, color) {
  const picker = document.getElementById(pickerId);
  picker.previousElementSibling.value = color;
  picker.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color === color)
  );
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
