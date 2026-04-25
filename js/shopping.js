'use strict';

// ─── State ────────────────────────────────────────────────────
let activeListId  = null;  // null = vue listes
let editingListId = null;

// ─── Entry point ──────────────────────────────────────────────
function renderShoppingLists() {
  if (activeListId) {
    renderListDetail(activeListId);
  } else {
    renderListsOverview();
  }
}

// ─── Lists overview ───────────────────────────────────────────
function renderListsOverview() {
  const container = document.getElementById('shopping-content');
  const lists     = db.shoppingLists;

  document.getElementById('shop-back-btn').classList.add('d-none');
  document.getElementById('shop-header-title').textContent = t('shop_title');
  document.getElementById('btn-add-list').classList.remove('d-none');

  if (lists.length === 0) {
    container.innerHTML = `
      <div class="empty-state mt-5">
        <i class="bi bi-cart-x" style="font-size:3rem;"></i>
        <p class="fw-semibold mt-2">${t('shop_empty')}</p>
        <p class="text-muted small">${t('shop_empty_sub')}</p>
      </div>`;
    return;
  }

  const active    = lists.filter(l => l.status === 'active');
  const completed = lists.filter(l => l.status === 'completed');

  let html = '';
  if (active.length > 0) {
    html += `<div class="row g-3 mb-4">${active.map(listCard).join('')}</div>`;
  }
  if (completed.length > 0) {
    html += `
      <div class="text-muted small fw-semibold mb-2 ps-1">
        <i class="bi bi-check2-all me-1"></i>${t('shop_status_done')}
      </div>
      <div class="row g-3">${completed.map(listCard).join('')}</div>`;
  }
  container.innerHTML = html;
}

function listCard(list) {
  const total   = list.items.length;
  const checked = list.items.filter(i => i.checked).length;
  const pct     = total > 0 ? Math.round(checked / total * 100) : 0;
  const isDone  = list.status === 'completed';
  const est     = _estimatedTotal(list);
  const barColor = isDone ? '#10b981' : '#10b981';

  return `
    <div class="col-12 col-sm-6 col-xl-4">
      <div class="card shopping-list-card ${isDone ? 'opacity-75' : ''}" onclick="openList('${list.id}')">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-semibold">${escHtml(list.name)}</div>
              <div class="text-muted small">${list.date ? fmtDate(list.date) : ''}</div>
            </div>
            <div class="d-flex gap-1" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="openEditListModal('${list.id}')" title="${t('btn_update')}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="confirmDeleteList('${list.id}')" title="${t('btn_delete')}">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="text-muted">${checked}/${total} ${t('shop_items_done')}</small>
            ${est > 0 ? `<small class="text-muted">${t('shop_budget_est')}: ${fmt(est)}</small>` : ''}
          </div>
          <div class="progress" style="height:6px;">
            <div class="progress-bar" role="progressbar"
                 style="width:${pct}%; background-color:${barColor};"
                 aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          ${isDone ? `<span class="badge mt-2" style="background:#10b981;">${t('shop_status_done')}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function _estimatedTotal(list) {
  return list.items.reduce((s, i) => {
    if (i.unit_price) return s + i.unit_price * (i.quantity || 1);
    return s;
  }, 0);
}

// ─── Open list ────────────────────────────────────────────────
function openList(listId) {
  activeListId = listId;
  renderListDetail(listId);
}

function closeList() {
  activeListId = null;
  renderListsOverview();
}

// ─── List detail ──────────────────────────────────────────────
function renderListDetail(listId) {
  const list = db.shoppingLists.find(l => l.id === listId);
  if (!list) { closeList(); return; }

  document.getElementById('shop-back-btn').classList.remove('d-none');
  document.getElementById('shop-header-title').textContent = escHtml(list.name);
  document.getElementById('btn-add-list').classList.add('d-none');

  const unchecked = list.items.filter(i => !i.checked);
  const checked   = list.items.filter(i => i.checked);
  const est       = _estimatedTotal(list);
  const total     = list.items.length;
  const doneCount = checked.length;
  const pct       = total > 0 ? Math.round(doneCount / total * 100) : 0;
  const isDone    = list.status === 'completed';

  let html = `
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <span class="badge ${isDone ? 'bg-success' : 'bg-primary'} me-2">
              ${isDone ? t('shop_status_done') : t('shop_status_active')}
            </span>
            <small class="text-muted">${doneCount}/${total} ${t('shop_items_done')}</small>
            ${est > 0 ? `<small class="text-muted ms-3">${t('shop_budget_est')}: <strong>${fmt(est)}</strong></small>` : ''}
          </div>
          <button class="btn btn-sm ${isDone ? 'btn-outline-primary' : 'btn-outline-success'}"
                  onclick="toggleListStatus('${list.id}')">
            <i class="bi ${isDone ? 'bi-arrow-counterclockwise' : 'bi-check2-all'} me-1"></i>
            ${isDone ? t('shop_mark_active') : t('shop_mark_done')}
          </button>
        </div>
        <div class="progress mt-2" style="height:6px;">
          <div class="progress-bar bg-success" role="progressbar"
               style="width:${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    </div>`;

  if (list.items.length === 0) {
    html += `
      <div class="empty-state" style="padding:32px 0;">
        <i class="bi bi-cart-plus" style="font-size:2.5rem;"></i>
        <p class="fw-semibold mt-2">${t('shop_items_empty')}</p>
        <p class="text-muted small">${t('shop_items_empty_sub')}</p>
      </div>`;
  } else {
    if (unchecked.length > 0) {
      html += `<div class="card mb-3"><div class="list-group list-group-flush rounded">
        ${unchecked.map(itemRow).join('')}
      </div></div>`;
    }
    if (checked.length > 0) {
      html += `
        <div class="text-muted small fw-semibold mb-1 ps-1">
          <i class="bi bi-check2-all me-1"></i>${t('shop_status_done')}
        </div>
        <div class="card mb-3"><div class="list-group list-group-flush rounded">
          ${checked.map(itemRow).join('')}
        </div></div>`;
    }
  }

  // Quick-add form
  html += `
    <div class="card">
      <div class="card-header fw-semibold">${t('shop_add_item')}</div>
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-sm">
            <div class="input-group">
              <input type="text" id="new-item-name" class="form-control" placeholder="${t('item_name_placeholder')}"
                     onkeydown="if(event.key==='Enter') quickAddItem('${list.id}')">
              <button class="btn btn-outline-secondary" type="button" onclick="openScanModal('${list.id}')" title="${t('scan_btn')}">
                <i class="bi bi-upc-scan"></i>
              </button>
            </div>
          </div>
          <div class="col-5 col-sm-2">
            <input type="number" id="new-item-qty" class="form-control" placeholder="${t('label_quantity')}"
                   value="1" min="0.01" step="0.01">
          </div>
          <div class="col-5 col-sm-2">
            <input type="text" id="new-item-unit" class="form-control" placeholder="${t('unit_placeholder')}">
          </div>
          <div class="col-2 col-sm-auto">
            <button class="btn btn-primary w-100" onclick="quickAddItem('${list.id}')">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('shopping-content').innerHTML = html;
  document.getElementById('new-item-name').focus();
}

function itemRow(item) {
  const cat     = item.category ? getExpenseCategoryById(item.category) : null;
  const catHtml = cat ? `<span class="cat-badge ms-2" style="background:${cat.color}22;color:${cat.color};">${cat.icon} ${escHtml(cat.name)}</span>` : '';
  const priceHtml = item.unit_price
    ? `<small class="text-muted ms-2">${fmt(item.unit_price * (item.quantity || 1))}</small>` : '';
  const qty = item.quantity && item.quantity !== 1
    ? `<small class="text-muted me-1">${item.quantity}${item.unit ? ' ' + escHtml(item.unit) : ''}</small>` : '';

  return `
    <div class="list-group-item list-group-item-action d-flex align-items-center gap-2 py-2 px-3 ${item.checked ? 'item-checked' : ''}">
      <input class="form-check-input flex-shrink-0 mt-0" type="checkbox" ${item.checked ? 'checked' : ''}
             onchange="toggleItem('${item.id}', this.checked)">
      <div class="flex-grow-1 d-flex align-items-center flex-wrap gap-1 ${item.checked ? 'text-decoration-line-through text-muted' : ''}">
        <span>${escHtml(item.name)}</span>
        ${qty}${catHtml}${priceHtml}
      </div>
      <div class="d-flex gap-1 flex-shrink-0">
        <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="openEditItemModal('${item.id}')" title="${t('btn_update')}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="confirmDeleteItem('${item.id}')" title="${t('btn_delete')}">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>`;
}

// ─── Toggle item ──────────────────────────────────────────────
async function toggleItem(itemId, checked) {
  try {
    await updateShoppingListItem(itemId, { checked });
    renderListDetail(activeListId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Toggle list status ───────────────────────────────────────
async function toggleListStatus(listId) {
  const list   = db.shoppingLists.find(l => l.id === listId);
  if (!list) return;
  const status = list.status === 'completed' ? 'active' : 'completed';
  try {
    await updateShoppingList(listId, { status });
    if (status === 'completed') showToast(t('toast_list_done'), 'success');
    renderListDetail(listId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Quick add item ───────────────────────────────────────────
async function quickAddItem(listId) {
  const nameEl = document.getElementById('new-item-name');
  const qtyEl  = document.getElementById('new-item-qty');
  const unitEl = document.getElementById('new-item-unit');
  const name   = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  try {
    await addShoppingListItem(listId, {
      name,
      quantity: parseFloat(qtyEl.value) || 1,
      unit:     unitEl.value.trim(),
    });
    showToast(t('toast_item_added'), 'success');
    renderListDetail(listId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── List modal (add / edit) ──────────────────────────────────
function openAddListModal() {
  editingListId = null;
  document.getElementById('listModalTitle').textContent = t('modal_add_list');
  document.getElementById('lf-name').value  = '';
  document.getElementById('lf-date').value  = new Date().toISOString().slice(0, 10);
  document.getElementById('le-name').textContent = '';
  document.getElementById('lf-name').classList.remove('is-invalid');
  bsListModal.show();
}

function openEditListModal(id) {
  const list = db.shoppingLists.find(l => l.id === id);
  if (!list) return;
  editingListId = id;
  document.getElementById('listModalTitle').textContent = t('modal_edit_list');
  document.getElementById('lf-name').value  = list.name;
  document.getElementById('lf-date').value  = list.date || '';
  document.getElementById('le-name').textContent = '';
  document.getElementById('lf-name').classList.remove('is-invalid');
  bsListModal.show();
}

async function saveListModal() {
  const name = document.getElementById('lf-name').value.trim();
  const date = document.getElementById('lf-date').value;
  if (!name) {
    document.getElementById('lf-name').classList.add('is-invalid');
    document.getElementById('le-name').textContent = t('err_list_name');
    return;
  }
  try {
    if (editingListId) {
      await updateShoppingList(editingListId, { name, date });
      showToast(t('toast_list_updated'), 'success');
    } else {
      await addShoppingList({ name, date });
      showToast(t('toast_list_added'), 'success');
    }
    bsListModal.hide();
    renderShoppingLists();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Delete list ──────────────────────────────────────────────
function confirmDeleteList(id) {
  confirmDelete(t('confirm_delete_list'), async () => {
    try {
      await deleteShoppingList(id);
      showToast(t('toast_list_deleted'), 'success');
      if (activeListId === id) activeListId = null;
      renderShoppingLists();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

// ─── Edit item modal ──────────────────────────────────────────
let editingItemId = null;

function openEditItemModal(itemId) {
  let item = null;
  for (const sl of db.shoppingLists) {
    item = sl.items.find(i => i.id === itemId);
    if (item) break;
  }
  if (!item) return;
  editingItemId = itemId;
  document.getElementById('itemModalTitle').textContent = t('btn_update');
  document.getElementById('if-name').value      = item.name;
  document.getElementById('if-qty').value       = item.quantity || 1;
  document.getElementById('if-unit').value      = item.unit || '';
  document.getElementById('if-price').value     = item.unit_price || '';
  document.getElementById('if-note').value      = item.note || '';
  populateItemCategorySelect(item.category);
  bsItemModal.show();
}

function populateItemCategorySelect(selected) {
  const sel = document.getElementById('if-cat');
  sel.innerHTML = `<option value="">— ${t('label_category')} —</option>` +
    db.expenseCategories.map(c =>
      `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${c.icon} ${escHtml(c.name)}</option>`
    ).join('');
}

async function saveItemModal() {
  const name = document.getElementById('if-name').value.trim();
  if (!name) {
    document.getElementById('if-name').focus();
    return;
  }
  const updates = {
    name,
    quantity:   parseFloat(document.getElementById('if-qty').value) || 1,
    unit:       document.getElementById('if-unit').value.trim(),
    unit_price: parseFloat(document.getElementById('if-price').value) || null,
    note:       document.getElementById('if-note').value.trim(),
    category:   document.getElementById('if-cat').value || null,
  };
  try {
    await updateShoppingListItem(editingItemId, updates);
    showToast(t('toast_item_updated'), 'success');
    bsItemModal.hide();
    renderListDetail(activeListId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Delete item ──────────────────────────────────────────────
function confirmDeleteItem(itemId) {
  confirmDelete(t('confirm_delete_item'), async () => {
    try {
      await deleteShoppingListItem(itemId);
      showToast(t('toast_item_deleted'), 'success');
      renderListDetail(activeListId);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

// ─── Barcode scanner ──────────────────────────────────────────
let _scanStream   = null;
let _scanInterval = null;
let _scanListId   = null;

function openScanModal(listId) {
  _scanListId = listId;
  document.getElementById('scan-result-area').classList.add('d-none');
  document.getElementById('scan-manual-input').value = '';
  document.getElementById('scan-product-name').value = '';
  bsScanModal.show();
}

let _zxingControls = null;

async function bsScanModal_onShow() {
  const video = document.getElementById('scan-video');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    _showScanFallback(t('scan_not_supported') + (window.isSecureContext ? '' : ' (HTTPS requis)'));
    return;
  }
  if (!window.ZXingBrowser) {
    _showScanFallback(t('scan_camera_error') + ' — librairie ZXing non chargée');
    return;
  }
  try {
    const reader = new ZXingBrowser.BrowserMultiFormatReader();
    const devices = await ZXingBrowser.BrowserMultiFormatReader.listVideoInputDevices();
    const rear = devices.find(d => /back|rear|environment/i.test(d.label));
    const deviceId = rear ? rear.deviceId : (devices[0] && devices[0].deviceId) || undefined;

    _zxingControls = await reader.decodeFromVideoDevice(deviceId, video, (result, err, controls) => {
      if (result) {
        controls.stop();
        _zxingControls = null;
        _onBarcodeDetected(result.getText());
      }
    });
  } catch (err) {
    let msg = t('scan_camera_error');
    if (err && err.name === 'NotAllowedError')       msg += ' — permission refusée';
    else if (err && err.name === 'NotFoundError')    msg += ' — aucune caméra détectée';
    else if (err && err.name === 'NotReadableError') msg += ' — caméra utilisée par une autre app';
    else if (err && err.message)                      msg += ' — ' + err.message;
    _showScanFallback(msg);
  }
}

function stopScan() {
  if (_zxingControls) { try { _zxingControls.stop(); } catch {} _zxingControls = null; }
  if (_scanStream) { _scanStream.getTracks().forEach(t => t.stop()); _scanStream = null; }
  if (_scanInterval) { clearInterval(_scanInterval); _scanInterval = null; }
  const video = document.getElementById('scan-video');
  if (video) video.srcObject = null;
}

function _showScanFallback(msg) {
  const videoWrap = document.getElementById('scan-video-wrap');
  if (videoWrap) videoWrap.innerHTML = `<div class="text-muted small text-center py-3">${msg}</div>`;
}

async function _onBarcodeDetected(barcode) {
  document.getElementById('scan-manual-input').value = barcode;
  await lookupBarcode(barcode);
}

async function lookupBarcode(barcode) {
  if (!barcode) return;
  const area = document.getElementById('scan-result-area');
  const nameEl = document.getElementById('scan-product-name');
  area.classList.remove('d-none');
  nameEl.value = '…';
  try {
    const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1) {
      const name = data.product.product_name_fr || data.product.product_name || '';
      nameEl.value = name;
      if (name) showToast(t('scan_found') + ': ' + name, 'success');
      else nameEl.value = barcode;
    } else {
      nameEl.value = barcode;
      showToast(t('scan_not_found'), 'error');
    }
  } catch {
    nameEl.value = barcode;
  }
}

function applyScanResult() {
  const name = document.getElementById('scan-product-name').value.trim();
  if (!name) return;
  bsScanModal.hide();
  stopScan();
  // Pre-fill the quick-add form in the detail view
  const nameEl = document.getElementById('new-item-name');
  if (nameEl) { nameEl.value = name; nameEl.focus(); }
}

function onScanModalHide() {
  stopScan();
}
