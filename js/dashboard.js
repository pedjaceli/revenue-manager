'use strict';

// ─── Grocery budget (per-user, backend) ───────────────────
function getGroceryBudget() {
  return db.groceryBudget || 0;
}

function showGroceryBudgetEdit() {
  document.getElementById('grocery-budget-view').classList.add('d-none');
  document.getElementById('grocery-budget-edit').classList.remove('d-none');
  const input = document.getElementById('grocery-budget-input');
  input.value = getGroceryBudget() || '';
  input.focus();
}

function hideGroceryBudgetEdit() {
  document.getElementById('grocery-budget-edit').classList.add('d-none');
  document.getElementById('grocery-budget-view').classList.remove('d-none');
}

async function confirmSaveGroceryBudget() {
  const amount = parseFloat(document.getElementById('grocery-budget-input').value) || 0;
  try {
    await updateGroceryBudget(amount);
    hideGroceryBudgetEdit();
    renderDashboard();
    showToast(t('toast_grocery_budget_saved'), 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function _invoiceTotal(inv) {
  return inv.total != null ? inv.total
    : (inv.items || []).reduce((t, i) => t + i.quantity * i.unit_price, 0);
}

function renderDashboard() {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Budget épicerie mensuel ───────────────────────────────
  const budgetMonth = getGroceryBudget();
  document.getElementById('stat-month').textContent     = budgetMonth > 0 ? fmt(budgetMonth) : '—';
  document.getElementById('stat-month-sub').textContent = t(budgetMonth > 0 ? 'stat_budget_month' : 'stat_set_budget');

  // ── Dépenses épicerie ce mois (listes de courses) ─────────
  const monthLists   = (db.shoppingLists || []).filter(l => l.date && l.date.startsWith(thisMonth));
  const grocerySpent = monthLists
    .flatMap(l => l.items || [])
    .filter(i => i.checked && i.unit_price > 0)
    .reduce((s, i) => s + (i.quantity || 1) * i.unit_price, 0);
  document.getElementById('stat-spent').textContent       = fmt(grocerySpent);
  document.getElementById('stat-spent-count').textContent = `${monthLists.length} ${t('stat_lists')}`;

  // ── Reste à dépenser ──────────────────────────────────────
  const remEl  = document.getElementById('stat-remaining');
  const remSub = document.getElementById('stat-remaining-sub');
  if (budgetMonth <= 0) {
    remEl.textContent = '—';
    remEl.className   = 'stat-value';
    remSub.textContent = t('stat_no_budget_set');
    remSub.className   = 'text-muted';
  } else {
    const remaining = budgetMonth - grocerySpent;
    remEl.textContent = fmt(remaining);
    remEl.className   = 'stat-value' + (remaining < 0 ? ' text-danger' : remaining < budgetMonth * 0.2 ? ' text-warning' : '');
    if (remaining < 0) {
      remSub.textContent = t('stat_over_budget');
      remSub.className   = 'text-danger';
    } else {
      remSub.textContent = `${Math.round(remaining / budgetMonth * 100)}% ${t('pct_of_total')}`;
      remSub.className   = '';
    }
  }

  // ── Barre de progression budget épicerie ──────────────────
  const pctUsed  = budgetMonth > 0 ? Math.min(100, Math.round(grocerySpent / budgetMonth * 100)) : 0;
  const barColor = pctUsed >= 100 ? 'bg-danger' : pctUsed >= 80 ? 'bg-warning' : 'bg-success';
  const barEl    = document.getElementById('grocery-budget-bar');
  barEl.style.width = pctUsed + '%';
  barEl.className   = `progress-bar ${barColor}`;
  barEl.setAttribute('aria-valuenow', pctUsed);
  document.getElementById('grocery-budget-pct').textContent = budgetMonth > 0
    ? `${fmt(grocerySpent)} / ${fmt(budgetMonth)} — ${pctUsed}% ${t('stat_budget_used')}`
    : t('stat_no_budget_set');

  // ── Moyenne épicerie mensuelle (12 mois) ──────────────────
  const months12 = {};
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months12[key] = 0;
  }
  (db.shoppingLists || []).forEach(l => {
    const m = l.date ? l.date.slice(0, 7) : null;
    if (m && m in months12) {
      months12[m] += (l.items || [])
        .filter(i => i.checked && i.unit_price > 0)
        .reduce((s, i) => s + (i.quantity || 1) * i.unit_price, 0);
    }
  });
  const avg = Object.values(months12).reduce((a, b) => a + b, 0) / 12;
  document.getElementById('stat-avg').textContent = fmt(avg);

  // ── Dernières dépenses ────────────────────────────────────
  const allRecent = [
    ...(db.expenses || []).map(e => ({
      date:        e.date,
      description: e.description,
      amount:      e.amount,
      catId:       e.category,
      type:        'expense',
    })),
    ...(db.invoices || []).map(inv => ({
      date:        inv.date,
      description: inv.title || inv.description || '—',
      amount:      _invoiceTotal(inv),
      catId:       inv.category,
      type:        'invoice',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const recentEl = document.getElementById('recent-list');
  if (allRecent.length === 0) {
    recentEl.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-cart-x"></i>
        <p>${t('empty_no_expenses')}</p>
      </div>`;
  } else {
    recentEl.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>${t('col_date')}</th><th>${t('col_description')}</th>
              <th>${t('col_category')}</th><th>${t('col_amount')}</th>
            </tr>
          </thead>
          <tbody>
            ${allRecent.map(e => {
              const cat  = getExpenseCategoryById(e.catId);
              const icon = e.type === 'invoice'
                ? '<i class="bi bi-receipt me-1 text-muted small"></i>' : '';
              return `<tr>
                <td class="text-muted small">${fmtDate(e.date)}</td>
                <td class="fw-semibold">${icon}${escHtml(e.description)}</td>
                <td>
                  <span class="cat-badge" style="background:${cat.color}22; color:${cat.color};">
                    ${cat.icon} ${escHtml(cat.name)}
                  </span>
                </td>
                <td class="amount-cell">${fmt(e.amount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Répartition dépenses par catégorie (ce mois) ──────────
  const monthExpenses = (db.expenses || []).filter(e => e.date && e.date.startsWith(thisMonth));
  const monthInvoices = (db.invoices || []).filter(i => i.date && i.date.startsWith(thisMonth));
  const spentMonth =
    monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
    monthInvoices.reduce((s, i) => s + _invoiceTotal(i), 0);

  const catBreakEl = document.getElementById('category-breakdown');
  if (spentMonth === 0) {
    catBreakEl.innerHTML = `
      <div class="empty-state" style="padding:24px 0;">
        <i class="bi bi-tags"></i>
        <p>${t('empty_no_data')}</p>
      </div>`;
    return;
  }

  const byCat = {};
  monthExpenses.forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  });
  monthInvoices.forEach(inv => {
    const cat = inv.category || 'other';
    byCat[cat] = (byCat[cat] || 0) + _invoiceTotal(inv);
  });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  catBreakEl.innerHTML = sorted.map(([catId, amt]) => {
    const cat = getExpenseCategoryById(catId);
    const pct = spentMonth > 0 ? Math.round(amt / spentMonth * 100) : 0;
    return `
      <div class="mb-3">
        <div class="cat-progress-label">
          <span class="name">${cat.icon} ${escHtml(cat.name)}</span>
          <span class="amount">${fmt(amt)}</span>
        </div>
        <div class="progress">
          <div class="progress-bar" role="progressbar"
               style="width:${pct}%; background-color:${cat.color};"
               aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
        <div class="progress-pct">${pct}% ${t('pct_of_total')}</div>
      </div>`;
  }).join('');
}
