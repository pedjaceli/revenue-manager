'use strict';

// ─── Current active tab ───────────────────────────────────────
let expensesTab = 'invoices';

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
  ['invoices', 'aggregation'].forEach(id => {
    document.getElementById('tab-btn-' + id).classList.toggle('active', tab === id);
    document.getElementById('tab-' + id).classList.toggle('d-none', tab !== id);
  });
  if (tab === 'invoices') renderInvoiceList();
  else                    renderProductAggregation();
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

function openAddInvoiceModal() {
  editingInvoiceId = null;
  document.getElementById('invoiceModalTitle').textContent = t('modal_add_invoice');
  document.getElementById('inv-title').value = '';
  document.getElementById('inv-date').value  = new Date().toISOString().slice(0, 10);
  document.getElementById('inv-items-body').innerHTML = '';
  addInvoiceItemRow();
  updateInvoiceLineTotals();
  bsInvoiceModal.show();
}

function openEditInvoiceModal(id) {
  const inv = db.invoices.find(x => x.id === id);
  if (!inv) return;
  editingInvoiceId = id;
  document.getElementById('invoiceModalTitle').textContent = t('modal_edit_invoice');
  document.getElementById('inv-title').value = inv.title;
  document.getElementById('inv-date').value  = inv.date;
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
             value="${item ? item.quantity : 1}" min="0.01" step="0.01" />
    </td>
    <td style="width:120px">
      <input type="number" class="form-control form-control-sm inv-price"
             value="${item ? +(item.quantity * item.unit_price).toFixed(2) : ''}"
             min="0.01" step="0.01" placeholder="0.00" />
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
  const title = document.getElementById('inv-title').value.trim();
  const date  = document.getElementById('inv-date').value;

  if (!title || !date) {
    showToast(t('err_inv_required'), 'error');
    return;
  }

  const items = [];
  let valid = true;
  document.querySelectorAll('#inv-items-body tr').forEach(tr => {
    const product_name = tr.querySelector('.inv-product').value.trim();
    const quantity     = parseFloat(tr.querySelector('.inv-qty').value);
    const total_price  = parseFloat(tr.querySelector('.inv-price').value);
    if (!product_name || isNaN(quantity) || isNaN(total_price) || quantity <= 0 || total_price <= 0) {
      valid = false;
      return;
    }
    items.push({ product_name, quantity, unit_price: total_price / quantity });
  });

  if (!valid || items.length === 0) {
    showToast(t('err_inv_items'), 'error');
    return;
  }

  const btn = document.getElementById('invoiceSubmitBtn');
  btn.disabled = true;
  try {
    if (editingInvoiceId) {
      await updateInvoice(editingInvoiceId, { title, date, items });
      showToast(t('toast_invoice_updated'));
    } else {
      await addInvoice({ title, date, items });
      showToast(t('toast_invoice_added'));
    }
    bsInvoiceModal.hide();
    renderInvoiceList();
  } catch {
    showToast(t('toast_save_error'), 'error');
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

