'use strict';

// ─── Current active tab ───────────────────────────────────────
let expensesTab = 'invoices';
let editingExpenseCategoryId = null;
let bsExpenseCategoryModal = null;

function renderDepenses() {
  renderExpenseStats();
  switchExpensesTab(expensesTab);
}

function renderExpenseStats() {
  const now = new Date();
  const ym  = now.toISOString().slice(0, 7); // "YYYY-MM"
  const yr  = now.getFullYear().toString();

  let totalMonth = 0, totalYear = 0, grandTotal = 0;
  let countMonth = 0, countYear = 0, totalCount = 0;

  const addEntry = (amount, date) => {
    grandTotal += amount;
    totalCount++;
    if (date.startsWith(yr)) { totalYear += amount; countYear++; }
    if (date.startsWith(ym)) { totalMonth += amount; countMonth++; }
  };

  (db.invoices || []).forEach(inv => {
    const total = inv.total != null ? inv.total
      : (inv.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    addEntry(total, inv.date || '');
  });

  (db.expenses || []).forEach(exp => addEntry(exp.amount || 0, exp.date || ''));

  const allDates = [...(db.invoices || []), ...(db.expenses || [])]
    .map(e => e.date).filter(Boolean).sort();
  let avgMonthly = 0;
  if (allDates.length > 0) {
    const oldest = new Date(allDates[0]);
    const months = Math.max(1, (now - oldest) / (1000 * 60 * 60 * 24 * 30.44));
    avgMonthly = grandTotal / months;
  }

  const set = (id, val, countId, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(val);
    if (countId) {
      const cel = document.getElementById(countId);
      if (cel) cel.textContent = `${count} ${t('stat_expenses')}`;
    }
  };

  set('exp-stat-month', totalMonth, 'exp-stat-month-count', countMonth);
  set('exp-stat-year',  totalYear,  'exp-stat-year-count',  countYear);
  set('exp-stat-total', grandTotal, 'exp-stat-total-count', totalCount);
  set('exp-stat-avg',   avgMonthly, null, null);
}

function switchExpensesTab(tab) {
  expensesTab = tab;
  ['invoices', 'aggregation', 'categories'].forEach(id => {
    document.getElementById('tab-btn-' + id).classList.toggle('active', tab === id);
    document.getElementById('tab-' + id).classList.toggle('d-none', tab !== id);
  });
  if      (tab === 'invoices')   renderInvoiceList();
  else if (tab === 'categories') renderExpenseCategoryList();
  else                            renderProductAggregation();
}

// ─── Invoice List ─────────────────────────────────────────────
function renderInvoiceList() {
  const container = document.getElementById('invoice-list-container');
  if (db.invoices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-receipt"></i>
        <p>${t('empty_no_invoices')}</p>
      </div>`;
    return;
  }

  const sorted = [...db.invoices].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.map(inv => {
    const total = inv.total != null ? inv.total
      : inv.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return `
      <div class="invoice-row p-3 border-bottom">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escHtml(inv.title)}</div>
            <div class="text-muted small">${fmtDate(inv.date)} · ${inv.items.length} ${t('inv_items_count')}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="amount-cell">${fmt(total)}</span>
            <button class="btn btn-outline-secondary btn-sm"
                    onclick="openEditInvoiceModal('${inv.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm"
                    onclick="askDeleteInvoice('${inv.id}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
        ${inv.items.length > 0 ? `
          <div class="mt-2 ps-2">
            ${inv.items.map(item => `
              <div class="d-flex justify-content-between text-muted small border-start ps-2 mb-1">
                <span>${escHtml(item.product_name)} × ${item.quantity}</span>
                <span>${fmt(item.quantity * item.unit_price)}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  }).join('');
}


// ─── Invoice Modal ────────────────────────────────────────────
let editingInvoiceId = null;
let bsInvoiceModal;

function _populateInvoiceCategoryOptions(selectedId) {
  const sel = document.getElementById('inv-category');
  if (!sel) return;
  const cats = db.expenseCategories || [];
  const noneLabel = t('cat_none') || '— Aucune —';
  sel.innerHTML =
    `<option value="">${escHtml(noneLabel)}</option>` +
    cats.map(c =>
      `<option value="${escHtml(c.id)}">${escHtml((c.icon || '') + ' ' + c.name)}</option>`
    ).join('');
  sel.value = selectedId || '';
}

function openAddInvoiceModal() {
  editingInvoiceId = null;
  document.getElementById('invoiceModalTitle').textContent = t('modal_add_invoice');
  document.getElementById('inv-title').value = '';
  document.getElementById('inv-date').value  = new Date().toISOString().slice(0, 10);
  document.getElementById('inv-items-body').innerHTML = '';
  _populateInvoiceCategoryOptions('');
  addInvoiceItemRow();
  updateInvoiceLineTotals();
  _resetScanReceiptUI();
  bsInvoiceModal.show();
  // Remember the modal is open so we can reopen it if iOS reloads the page
  // during camera capture (memory eviction)
  try { sessionStorage.setItem('rm-invoice-modal-open', '1'); } catch {}
}

function _resetScanReceiptUI() {
  const status = document.getElementById('scan-receipt-status');
  const fileIn = document.getElementById('receipt-file');
  const btn    = document.getElementById('scanReceiptBtn');
  if (status) status.textContent = '';
  if (fileIn) fileIn.value = '';
  if (btn) btn.disabled = false;
}

// Downscale + recompress an image File to a JPEG Blob.
// Keeps receipts readable for OCR while staying well under server limits.
async function _compressReceiptImage(file, maxDim = 1800, quality = 0.82) {
  // Skip compression for tiny images (already small, e.g. screenshots)
  if (file.size < 500 * 1024) return file;

  try {
    const bitmap = await (window.createImageBitmap
      ? createImageBitmap(file)
      : new Promise((resolve, reject) => {
          const img = new Image();
          img.onload  = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        }));

    const w = bitmap.width  || bitmap.naturalWidth;
    const h = bitmap.height || bitmap.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, outW, outH);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;
    // Only keep the compressed version if it's actually smaller
    return blob.size < file.size ? blob : file;
  } catch {
    return file; // fall back to original on any failure
  }
}

async function handleReceiptUpload(file) {
  const btn    = document.getElementById('scanReceiptBtn');
  const status = document.getElementById('scan-receipt-status');
  if (!file) {
    if (status) { status.style.color = '#fca5a5'; status.textContent = '⚠ Aucun fichier reçu'; }
    return;
  }
  btn.disabled = true;
  status.style.color = '';
  status.textContent = t('scan_receipt_progress');

  try {
    const compressed = await _compressReceiptImage(file);
    const fd = new FormData();
    fd.append('image', compressed, 'receipt.jpg');
    const res = await fetch('/api/invoices/scan-receipt', { method: 'POST', body: fd });
    let data;
    try { data = await res.json(); }
    catch { throw new Error(`HTTP ${res.status} — réponse non-JSON`); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    if (data.title) document.getElementById('inv-title').value = data.title;
    if (data.date)  document.getElementById('inv-date').value  = data.date;

    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length > 0) {
      document.getElementById('inv-items-body').innerHTML = '';
      items.forEach(it => {
        const qtyRaw = parseFloat(it.quantity);
        const qty   = isNaN(qtyRaw) ? 1 : qtyRaw;
        const total = parseFloat(it.total_price) || 0;
        const unit  = qty > 0 ? total / qty : total;
        addInvoiceItemRow({
          product_name: it.product_name || '',
          quantity:     qty,
          unit_price:   unit,
        });
      });
      updateInvoiceLineTotals();
    }

    status.style.color = '#6ee7b7';
    status.textContent = t('scan_receipt_done');
    showToast(t('scan_receipt_done'), 'success');
    // Highlight the Save button so the user sees they still need to confirm
    const saveBtn = document.getElementById('invoiceSubmitBtn');
    if (saveBtn) {
      saveBtn.classList.add('btn-pulse');
      saveBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => saveBtn.classList.remove('btn-pulse'), 6000);
    }
  } catch (e) {
    const msg = e?.message || t('scan_receipt_error');
    status.textContent = '⚠ ' + msg;
    status.style.color = '#fca5a5';
    showToast(msg, 'error');
    console.error('[scan-receipt]', e);
  } finally {
    btn.disabled = false;
    document.getElementById('receipt-file').value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileIn = document.getElementById('receipt-file');
  if (fileIn) fileIn.addEventListener('change', e => handleReceiptUpload(e.target.files[0]));

  // Clear the "modal open" flag when the modal closes normally
  const modalEl = document.getElementById('invoiceModal');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      try { sessionStorage.removeItem('rm-invoice-modal-open'); } catch {}
    });
  }

  // If iOS killed the page during camera capture, reopen the modal automatically
  // and warn the user to retry the scan (the file selection was lost).
  try {
    if (sessionStorage.getItem('rm-invoice-modal-open') === '1') {
      sessionStorage.removeItem('rm-invoice-modal-open');
      // Wait until the app finished bootstrapping (db loaded, modals built)
      setTimeout(() => {
        if (typeof openAddInvoiceModal === 'function' && typeof bsInvoiceModal !== 'undefined') {
          openAddInvoiceModal();
          const status = document.getElementById('scan-receipt-status');
          if (status) {
            status.style.color = '#fcd34d';
            status.textContent = '⚠ La page a été rechargée pendant la prise de photo. Veuillez relancer le scan.';
          }
        }
      }, 800);
    }
  } catch {}
});

function openEditInvoiceModal(id) {
  const inv = db.invoices.find(x => x.id === id);
  if (!inv) return;
  editingInvoiceId = id;
  document.getElementById('invoiceModalTitle').textContent = t('modal_edit_invoice');
  document.getElementById('inv-title').value = inv.title;
  document.getElementById('inv-date').value  = inv.date;
  _populateInvoiceCategoryOptions(inv.category || '');
  document.getElementById('inv-items-body').innerHTML = '';
  if (inv.items.length > 0) {
    inv.items.forEach(item => addInvoiceItemRow(item));
  } else {
    addInvoiceItemRow();
  }
  updateInvoiceLineTotals();
  bsInvoiceModal.show();
}

function addInvoiceItemRow(item = null) {
  const tbody = document.getElementById('inv-items-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <div class="product-input-wrap">
        <input type="text" class="form-control form-control-sm inv-product"
               value="${item ? escHtml(item.product_name) : ''}"
               placeholder="${t('inv_product_placeholder')}"
               autocomplete="off" />
      </div>
    </td>
    <td style="width:90px">
      <input type="number" class="form-control form-control-sm inv-qty"
             value="${item ? item.quantity : 1}" min="0" step="0.01" />
    </td>
    <td style="width:120px">
      <input type="number" class="form-control form-control-sm inv-price"
             value="${item ? +(item.quantity * item.unit_price).toFixed(2) : ''}"
             min="0" step="0.01" placeholder="0.00" />
    </td>
    <td style="width:40px">
      <button type="button" class="btn btn-outline-danger btn-sm"
              onclick="removeInvoiceItemRow(this)">
        <i class="bi bi-x"></i>
      </button>
    </td>`;
  tbody.appendChild(tr);
  tr.querySelector('.inv-price').addEventListener('input', updateInvoiceLineTotals);
  attachProductAutocomplete(tr.querySelector('.inv-product'));
}

// ─── Product Autocomplete ─────────────────────────────────────
function getKnownProducts() {
  const names = new Set();
  // From all saved invoices
  db.invoices.forEach(inv => inv.items.forEach(item => names.add(item.product_name)));
  // From currently open form rows (not yet saved)
  document.querySelectorAll('#inv-items-body .inv-product').forEach(inp => {
    const v = inp.value.trim();
    if (v) names.add(v);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function attachProductAutocomplete(input) {
  let activeIndex = -1;
  let currentDropdown = null;

  function closeDropdown() {
    currentDropdown?.remove();
    currentDropdown = null;
    activeIndex = -1;
  }

  function positionDropdown() {
    if (!currentDropdown) return;
    const rect = input.getBoundingClientRect();
    currentDropdown.style.top   = `${rect.bottom + 3}px`;
    currentDropdown.style.left  = `${rect.left}px`;
    currentDropdown.style.width = `${rect.width}px`;
  }

  function openDropdown(matches) {
    closeDropdown();
    if (!matches.length) return;

    const div = document.createElement('div');
    div.className = 'product-dropdown';
    const val = input.value.trim();

    matches.forEach(name => {
      const item = document.createElement('div');
      item.className = 'product-dropdown-item';
      item.dataset.name = name;

      const idx = name.toLowerCase().indexOf(val.toLowerCase());
      if (idx >= 0) {
        item.innerHTML =
          escHtml(name.slice(0, idx)) +
          `<strong>${escHtml(name.slice(idx, idx + val.length))}</strong>` +
          escHtml(name.slice(idx + val.length));
      } else {
        item.textContent = name;
      }

      item.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = name;
        closeDropdown();
        updateInvoiceLineTotals();
      });
      div.appendChild(item);
    });

    // Append to body so overflow containers don't clip it
    document.body.appendChild(div);
    currentDropdown = div;
    positionDropdown();
  }

  function refreshDropdown() {
    const val = input.value.trim().toLowerCase();
    if (!val) { closeDropdown(); return; }
    const matches = getKnownProducts().filter(n => n.toLowerCase().includes(val));
    openDropdown(matches);
  }

  input.addEventListener('input',  refreshDropdown);
  input.addEventListener('focus',  refreshDropdown);
  input.addEventListener('blur',   () => setTimeout(closeDropdown, 150));

  // Reposition on scroll or resize (modal scroll, window resize)
  const reposition = () => currentDropdown && positionDropdown();
  window.addEventListener('scroll',  reposition, true);
  window.addEventListener('resize',  reposition);

  input.addEventListener('keydown', e => {
    if (!currentDropdown) return;
    const items = currentDropdown.querySelectorAll('.product-dropdown-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      input.value = items[activeIndex].dataset.name;
      closeDropdown();
      updateInvoiceLineTotals();
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });
}

function removeInvoiceItemRow(btn) {
  btn.closest('tr').remove();
  updateInvoiceLineTotals();
}

function updateInvoiceLineTotals() {
  let grand = 0;
  document.querySelectorAll('#inv-items-body tr').forEach(tr => {
    grand += parseFloat(tr.querySelector('.inv-price')?.value) || 0;
  });
  const el = document.getElementById('inv-grand-total');
  if (el) el.textContent = grand > 0 ? fmt(grand) : '—';
}

async function submitInvoice() {
  const title    = document.getElementById('inv-title').value.trim();
  const date     = document.getElementById('inv-date').value;
  const category = document.getElementById('inv-category')?.value || null;

  if (!title || !date) {
    showToast(t('err_inv_required'), 'error');
    return;
  }

  const items = [];
  const badRows = [];
  // Clear any previous invalid-row highlights
  document.querySelectorAll('#inv-items-body tr').forEach(tr => {
    tr.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  });
  document.querySelectorAll('#inv-items-body tr').forEach((tr, idx) => {
    const productInput = tr.querySelector('.inv-product');
    const qtyInput     = tr.querySelector('.inv-qty');
    const priceInput   = tr.querySelector('.inv-price');
    const product_name = productInput.value.trim();
    const quantity     = parseFloat(qtyInput.value);
    const total_price  = parseFloat(priceInput.value);

    const reasons = [];
    if (!product_name)              { reasons.push('nom'); productInput.classList.add('is-invalid'); }
    if (isNaN(quantity) || quantity < 0) { reasons.push('qté'); qtyInput.classList.add('is-invalid'); }
    if (isNaN(total_price) || total_price < 0) { reasons.push('prix'); priceInput.classList.add('is-invalid'); }

    if (reasons.length) {
      badRows.push(`ligne ${idx + 1} (${reasons.join(', ')})`);
      return;
    }
    const unit_price = quantity > 0 ? total_price / quantity : total_price;
    items.push({ product_name, quantity, unit_price });
  });

  if (badRows.length || items.length === 0) {
    const detail = badRows.length ? ` — ${badRows.join(', ')}` : '';
    showToast(t('err_inv_items') + detail, 'error');
    return;
  }

  const btn = document.getElementById('invoiceSubmitBtn');
  btn.disabled = true;
  try {
    if (editingInvoiceId) {
      await updateInvoice(editingInvoiceId, { title, date, category, items });
      showToast(t('toast_invoice_updated'));
    } else {
      await addInvoice({ title, date, category, items });
      showToast(t('toast_invoice_added'));
    }
    bsInvoiceModal.hide();
    renderInvoiceList();
    if (typeof renderDashboard === 'function') renderDashboard();
  } catch (e) {
    console.error('[invoice-save]', e);
    showToast(`${t('toast_save_error')} — ${e?.message || 'inconnu'}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function askDeleteInvoice(id) {
  const inv = db.invoices.find(x => x.id === id);
  if (!inv) return;
  confirmDelete(
    `${t('btn_delete')} "${inv.title}" ?`,
    async () => {
      try {
        await deleteInvoice(id);
        showToast(t('toast_invoice_deleted'));
        renderInvoiceList();
      } catch { showToast(t('toast_delete_error'), 'error'); }
    }
  );
}


// ─── Product Aggregation ──────────────────────────────────────
function renderProductAggregation() {
  _populateAggFilters();

  const yearF  = document.getElementById('agg-filter-year').value;
  const monthF = document.getElementById('agg-filter-month').value;
  const search = document.getElementById('agg-search').value.toLowerCase();

  // Collect all items from invoices matching the period filter
  const map = new Map(); // product_name (lowercase) → { name, qty, amount, invoices }
  db.invoices.forEach(inv => {
    const [y, m] = inv.date.split('-');
    if (yearF  && y !== yearF)  return;
    if (monthF && m !== monthF) return;
    inv.items.forEach(item => {
      const key = item.product_name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: item.product_name, qty: 0, amount: 0, invoiceIds: new Set() });
      }
      const entry = map.get(key);
      entry.qty    += item.quantity;
      entry.amount += item.quantity * item.unit_price;
      entry.invoiceIds.add(inv.id);
    });
  });

  let rows = [...map.values()];

  // Search filter on product name
  if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search));

  // Sort by total amount desc
  rows.sort((a, b) => b.amount - a.amount);

  const container = document.getElementById('agg-container');

  if (rows.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-bag"></i>
        <p>${t('agg_empty')}</p>
      </div>`;
    return;
  }

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead><tr>
          <th>${t('agg_col_product')}</th>
          <th class="text-end">${t('agg_col_qty')}</th>
          <th class="text-end">${t('agg_col_amount')}</th>
          <th class="text-end d-none d-md-table-cell">${t('agg_col_invoices')}</th>
          <th style="width:110px" class="d-none d-sm-table-cell"></th>
        </tr></thead>
        <tbody>
          ${rows.map(r => {
            const pct = grandTotal > 0 ? (r.amount / grandTotal * 100).toFixed(1) : 0;
            return `<tr>
              <td class="fw-semibold">${escHtml(r.name)}</td>
              <td class="text-end text-muted">${r.qty % 1 === 0 ? r.qty : r.qty.toFixed(2)}</td>
              <td class="text-end amount-cell">${fmt(r.amount)}</td>
              <td class="text-end text-muted small d-none d-md-table-cell">${r.invoiceIds.size}</td>
              <td class="d-none d-sm-table-cell">
                <div class="d-flex align-items-center gap-1">
                  <div class="progress flex-grow-1" style="height:6px;">
                    <div class="progress-bar bg-primary" style="width:${pct}%"></div>
                  </div>
                  <small class="text-muted" style="min-width:36px;text-align:right">${pct}%</small>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="table-light fw-bold">
            <td colspan="2">${t('total_label')}</td>
            <td class="text-end amount-cell">${fmt(grandTotal)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function _populateAggFilters() {
  const yearSel = document.getElementById('agg-filter-year');
  yearSel.options[0].textContent = t('filter_all_years');
  if (yearSel.options.length <= 1) {
    [...new Set(db.invoices.map(inv => inv.date.slice(0, 4)))].sort().reverse().forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y; yearSel.appendChild(o);
    });
  }
  const monthSel = document.getElementById('agg-filter-month');
  monthSel.options[0].textContent = t('filter_all_months');
  if (monthSel.options.length <= 1) {
    getMonths().forEach((m, i) => {
      const o = document.createElement('option');
      o.value = String(i + 1).padStart(2, '0'); o.textContent = m;
      monthSel.appendChild(o);
    });
  }
}

// ─── Expense Categories CRUD UI ───────────────────────────────
function _expCatUsageCount(catId) {
  let n = 0;
  (db.invoices || []).forEach(i => { if (i.category === catId) n++; });
  (db.expenses || []).forEach(e => { if (e.category === catId) n++; });
  (db.shoppingLists || []).forEach(l => (l.items || []).forEach(it => {
    if (it.category === catId) n++;
  }));
  return n;
}

function renderExpenseCategoryList() {
  const el = document.getElementById('expense-cat-list');
  if (!el) return;
  const cats = db.expenseCategories || [];
  if (cats.length === 0) {
    el.innerHTML =
      `<div class="empty-state" style="padding:32px 0;">
         <i class="bi bi-tags"></i>
         <p>${t('empty_no_expense_cats')}</p>
       </div>`;
    return;
  }
  el.innerHTML = cats.map(c => {
    const usage = _expCatUsageCount(c.id);
    const canDelete = usage === 0;
    return `
      <div class="cat-row d-flex align-items-center gap-2 py-2 border-bottom">
        <span class="cat-emoji" style="font-size:1.25rem;">${escHtml(c.icon || '📦')}</span>
        <div class="cat-dot" style="width:14px;height:14px;border-radius:50%;background:${c.color || '#94a3b8'};"></div>
        <span class="cat-name flex-grow-1">${escHtml(c.name)}</span>
        <span class="cat-count text-muted small">${usage} ${t('cat_usage_count')}</span>
        <button class="btn btn-outline-secondary btn-sm" onclick="openEditExpenseCategoryModal('${c.id}')" title="${t('btn_edit')}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm ${canDelete ? '' : 'disabled'}"
                ${canDelete ? `onclick="askDeleteExpenseCategory('${c.id}')"` : 'disabled'}
                title="${canDelete ? t('btn_delete') : t('cat_cannot_delete')}">
          <i class="bi bi-trash3"></i>
        </button>
      </div>`;
  }).join('');
}

function openAddExpenseCategoryModal() {
  editingExpenseCategoryId = null;
  document.getElementById('expCatModalTitle').textContent = t('modal_add_category');
  document.getElementById('expcat-name').value  = '';
  document.getElementById('expcat-icon').value  = '';
  document.getElementById('expcat-color').value = '#10b981';
  if (!bsExpenseCategoryModal) {
    bsExpenseCategoryModal = new bootstrap.Modal(document.getElementById('expenseCategoryModal'));
  }
  bsExpenseCategoryModal.show();
}

function openEditExpenseCategoryModal(id) {
  const cat = (db.expenseCategories || []).find(c => c.id === id);
  if (!cat) return;
  editingExpenseCategoryId = id;
  document.getElementById('expCatModalTitle').textContent = t('modal_edit_category');
  document.getElementById('expcat-name').value  = cat.name || '';
  document.getElementById('expcat-icon').value  = cat.icon || '';
  document.getElementById('expcat-color').value = cat.color || '#10b981';
  if (!bsExpenseCategoryModal) {
    bsExpenseCategoryModal = new bootstrap.Modal(document.getElementById('expenseCategoryModal'));
  }
  bsExpenseCategoryModal.show();
}

async function submitExpenseCategory() {
  const name  = document.getElementById('expcat-name').value.trim();
  const icon  = document.getElementById('expcat-icon').value.trim() || '📦';
  const color = document.getElementById('expcat-color').value || '#10b981';
  if (!name) {
    showToast(t('err_cat_name'), 'error');
    document.getElementById('expcat-name').focus();
    return;
  }
  const btn = document.getElementById('expCatSubmitBtn');
  btn.disabled = true;
  try {
    if (editingExpenseCategoryId) {
      await updateExpenseCategory(editingExpenseCategoryId, { name, icon, color });
      showToast(t('toast_category_updated'), 'success');
    } else {
      await addExpenseCategory({ name, icon, color });
      showToast(t('toast_category_added'), 'success');
    }
    bsExpenseCategoryModal.hide();
    renderExpenseCategoryList();
    if (typeof renderDashboard === 'function') renderDashboard();
  } catch (e) {
    console.error('[expense-category-save]', e);
    showToast(`${t('toast_save_error')} — ${e?.message || ''}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function askDeleteExpenseCategory(id) {
  const cat = (db.expenseCategories || []).find(c => c.id === id);
  if (!cat) return;
  confirmDelete(
    `${t('btn_delete')} "${cat.name}" ?`,
    async () => {
      try {
        await deleteExpenseCategory(id);
        showToast(t('toast_category_deleted'), 'success');
        renderExpenseCategoryList();
        if (typeof renderDashboard === 'function') renderDashboard();
      } catch (e) {
        showToast(e?.message || t('toast_save_error'), 'error');
      }
    }
  );
}
