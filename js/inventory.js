'use strict';

// ─── State ────────────────────────────────────────────────────
let invLocation   = 'all';   // all | fridge | freezer | pantry
let editingInvId  = null;

// ─── Expiry helpers ───────────────────────────────────────────
function _daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.round((expiry - today) / 86400000);
}

function _expiryBadge(dateStr) {
  const days = _daysUntilExpiry(dateStr);
  if (days === null) return `<span class="badge bg-secondary">${t('inv_no_expiry')}</span>`;
  if (days < 0)      return `<span class="badge bg-danger">${t('inv_expired')}</span>`;
  if (days === 0)    return `<span class="badge bg-warning text-dark">${t('inv_expires_today')}</span>`;
  if (days <= 3)     return `<span class="badge bg-warning text-dark">${t('inv_expires_soon').replace('{n}', days)}</span>`;
  return `<span class="badge bg-success">${fmtDate(dateStr)}</span>`;
}

function _locationIcon(loc) {
  return { fridge: '🧊', freezer: '❄️', pantry: '🥫' }[loc] || '📦';
}

// ─── Entry point ──────────────────────────────────────────────
function renderInventory() {
  _renderStats();
  _renderItems();
}

// ─── Stats bar ────────────────────────────────────────────────
function _renderStats() {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const items  = db.inventory;
  const total   = items.length;
  const expired = items.filter(i => i.expiry_date && _daysUntilExpiry(i.expiry_date) < 0).length;
  const soon    = items.filter(i => i.expiry_date && _daysUntilExpiry(i.expiry_date) >= 0 && _daysUntilExpiry(i.expiry_date) <= 3).length;

  document.getElementById('inv-stat-total').textContent   = total;
  document.getElementById('inv-stat-soon').textContent    = soon;
  document.getElementById('inv-stat-expired').textContent = expired;

  // Alert banner
  const banner = document.getElementById('inv-alert-banner');
  if (expired > 0 || soon > 0) {
    const parts = [];
    if (expired > 0) parts.push(`<strong>${expired}</strong> produit(s) expiré(s)`);
    if (soon > 0)    parts.push(`<strong>${soon}</strong> expirent dans 3 jours`);
    banner.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${parts.join(' · ')}`;
    banner.classList.remove('d-none');
  } else {
    banner.classList.add('d-none');
  }
}

// ─── Items list ───────────────────────────────────────────────
function _renderItems() {
  const filtered = invLocation === 'all'
    ? db.inventory
    : db.inventory.filter(i => i.location === invLocation);

  // Sort: expired first, then expiring soon, then by expiry date, then no expiry
  const sorted = [...filtered].sort((a, b) => {
    const da = _daysUntilExpiry(a.expiry_date);
    const db_ = _daysUntilExpiry(b.expiry_date);
    if (da === null && db_ === null) return a.name.localeCompare(b.name);
    if (da === null) return 1;
    if (db_ === null) return -1;
    return da - db_;
  });

  const container = document.getElementById('inv-items-container');

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state mt-4">
        <i class="bi bi-box-seam" style="font-size:3rem;"></i>
        <p class="fw-semibold mt-2">${t('inv_empty')}</p>
        <p class="text-muted small">${t('inv_empty_sub')}</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>${t('col_description')}</th>
            <th>${t('label_quantity')}</th>
            <th>${t('label_location')}</th>
            <th>${t('label_category')}</th>
            <th>${t('label_expiry')}</th>
            <th class="text-end">${t('col_actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(invRow).join('')}
        </tbody>
      </table>
    </div>`;
}

function invRow(item) {
  const cat     = item.category ? getExpenseCategoryById(item.category) : null;
  const catHtml = cat
    ? `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color};">${cat.icon} ${escHtml(cat.name)}</span>`
    : '<span class="text-muted">—</span>';
  const qty     = `${item.quantity}${item.unit ? ' ' + escHtml(item.unit) : ''}`;
  const loc     = _locationIcon(item.location) + ' ' + t('inv_' + item.location);
  const days    = _daysUntilExpiry(item.expiry_date);
  const rowCls  = days !== null && days < 0 ? 'table-danger' : days !== null && days <= 3 ? 'table-warning' : '';

  return `<tr class="${rowCls}">
    <td class="fw-semibold">${escHtml(item.name)}${item.note ? `<br><small class="text-muted">${escHtml(item.note)}</small>` : ''}</td>
    <td>${qty}</td>
    <td><small>${loc}</small></td>
    <td>${catHtml}</td>
    <td>${_expiryBadge(item.expiry_date)}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-secondary py-0 px-1 me-1" onclick="openEditInvModal('${item.id}')">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="confirmDeleteInv('${item.id}')">
        <i class="bi bi-trash3"></i>
      </button>
    </td>
  </tr>`;
}

// ─── Location filter ──────────────────────────────────────────
function setInvLocation(loc) {
  invLocation = loc;
  document.querySelectorAll('.inv-loc-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.loc === loc);
  });
  _renderItems();
}

// ─── Modal: add / edit ────────────────────────────────────────
function openAddInvModal() {
  editingInvId = null;
  document.getElementById('invModalTitle').textContent = t('modal_add_inv');
  document.getElementById('ivf-name').value      = '';
  document.getElementById('ivf-qty').value       = '1';
  document.getElementById('ivf-unit').value      = '';
  document.getElementById('ivf-expiry').value    = '';
  document.getElementById('ivf-note').value      = '';
  document.getElementById('ivf-location').value  = invLocation === 'all' ? 'pantry' : invLocation;
  _populateInvCatSelect(null);
  bsInvModal.show();
}

function openEditInvModal(id) {
  const item = db.inventory.find(i => i.id === id);
  if (!item) return;
  editingInvId = id;
  document.getElementById('invModalTitle').textContent = t('modal_edit_inv');
  document.getElementById('ivf-name').value      = item.name;
  document.getElementById('ivf-qty').value       = item.quantity;
  document.getElementById('ivf-unit').value      = item.unit || '';
  document.getElementById('ivf-expiry').value    = item.expiry_date || '';
  document.getElementById('ivf-note').value      = item.note || '';
  document.getElementById('ivf-location').value  = item.location || 'pantry';
  _populateInvCatSelect(item.category);
  bsInvModal.show();
}

function _populateInvCatSelect(selected) {
  const sel = document.getElementById('ivf-cat');
  sel.innerHTML = `<option value="">— ${t('label_category')} —</option>` +
    db.expenseCategories.map(c =>
      `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${c.icon} ${escHtml(c.name)}</option>`
    ).join('');
}

async function saveInvModal() {
  const name = document.getElementById('ivf-name').value.trim();
  if (!name) { document.getElementById('ivf-name').focus(); return; }

  const data = {
    name,
    quantity:    parseFloat(document.getElementById('ivf-qty').value) || 1,
    unit:        document.getElementById('ivf-unit').value.trim(),
    category:    document.getElementById('ivf-cat').value || null,
    location:    document.getElementById('ivf-location').value,
    expiry_date: document.getElementById('ivf-expiry').value || null,
    note:        document.getElementById('ivf-note').value.trim(),
  };

  try {
    if (editingInvId) {
      await updateInventoryItem(editingInvId, data);
      showToast(t('toast_inv_updated'), 'success');
    } else {
      await addInventoryItem(data);
      showToast(t('toast_inv_added'), 'success');
    }
    bsInvModal.hide();
    renderInventory();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Delete ───────────────────────────────────────────────────
function confirmDeleteInv(id) {
  confirmDelete(t('confirm_delete_inv'), async () => {
    try {
      await deleteInventoryItem(id);
      showToast(t('toast_inv_deleted'), 'success');
      renderInventory();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}
