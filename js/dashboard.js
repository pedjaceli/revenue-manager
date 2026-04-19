'use strict';

function renderBalance() {
  const today = new Date().toISOString().slice(0, 10);

  const totalRevenues = db.revenues.reduce((s, r) => s + r.amount, 0);

  const totalExpenses = (db.expenses || [])
    .filter(e => e.date <= today)
    .reduce((s, e) => s + e.amount, 0);

  const totalInvoices = (db.invoices || [])
    .filter(inv => inv.date <= today)
    .reduce((s, inv) => {
      const total = inv.total != null ? inv.total
        : (inv.items || []).reduce((t, i) => t + i.quantity * i.unit_price, 0);
      return s + total;
    }, 0);

  const currentBalance = (db.initialBalance || 0) + totalRevenues - totalExpenses - totalInvoices;

  document.getElementById('balance-display').textContent = fmt(currentBalance);
  document.getElementById('balance-detail-text').textContent =
    `${t('balance_initial')}: ${fmt(db.initialBalance || 0)}` +
    ` + ${fmt(totalRevenues)} ${t('balance_revenues')}` +
    ` − ${fmt(totalExpenses + totalInvoices)} ${t('balance_expenses')}`;
}

function showBalanceEdit() {
  document.getElementById('balance-view').classList.add('d-none');
  document.getElementById('balance-edit').classList.remove('d-none');
  const input = document.getElementById('balance-input');
  input.value = db.initialBalance || 0;
  input.focus();
}

function hideBalanceEdit() {
  document.getElementById('balance-edit').classList.add('d-none');
  document.getElementById('balance-view').classList.remove('d-none');
}

async function saveBalance() {
  const amount = parseFloat(document.getElementById('balance-input').value) || 0;
  try {
    await updateInitialBalance(amount);
    hideBalanceEdit();
    renderBalance();
    showToast(t('toast_balance_saved'), 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderDashboard() {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());
  const sum       = arr => arr.reduce((a, r) => a + r.amount, 0);

  const monthRevs = db.revenues.filter(r => r.date.startsWith(thisMonth));
  const yearRevs  = db.revenues.filter(r => r.date.startsWith(thisYear));

  renderBalance();

  // ── Stat cards ────────────────────────────────────────────
  document.getElementById('stat-month').textContent       = fmt(sum(monthRevs));
  document.getElementById('stat-month-count').textContent = `${monthRevs.length} ${t('stat_entries')}`;
  document.getElementById('stat-year').textContent        = fmt(sum(yearRevs));
  document.getElementById('stat-year-count').textContent  = `${yearRevs.length} ${t('stat_entries')}`;
  document.getElementById('stat-total').textContent       = fmt(sum(db.revenues));
  document.getElementById('stat-total-count').textContent = `${db.revenues.length} ${t('stat_entries')}`;

  // Average over last 12 months
  const months12 = {};
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months12[key] = 0;
  }
  db.revenues.forEach(r => {
    const m = r.date.slice(0, 7);
    if (m in months12) months12[m] += r.amount;
  });
  const avg = Object.values(months12).reduce((a, b) => a + b, 0) / 12;
  document.getElementById('stat-avg').textContent = fmt(avg);

  // ── Recent revenues ───────────────────────────────────────
  const recent   = [...db.revenues].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const recentEl = document.getElementById('recent-list');

  if (recent.length === 0) {
    recentEl.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>${t('empty_no_revenue')}</p>
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
            ${recent.map(r => {
              const cat = getCategoryById(r.category);
              return `<tr>
                <td class="text-muted small">${fmtDate(r.date)}</td>
                <td class="fw-semibold">${escHtml(r.description)}</td>
                <td>
                  <span class="cat-badge" style="background:${cat.color}22; color:${cat.color};">
                    ${cat.icon} ${escHtml(cat.name)}
                  </span>
                </td>
                <td class="amount-cell">${fmt(r.amount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Category breakdown (current month) ───────────────────
  const catBreakEl  = document.getElementById('category-breakdown');
  const monthTotal  = sum(monthRevs);

  if (monthRevs.length === 0) {
    catBreakEl.innerHTML = `
      <div class="empty-state" style="padding:24px 0;">
        <i class="bi bi-tags"></i>
        <p>${t('empty_no_data')}</p>
      </div>`;
    return;
  }

  const byCat = {};
  monthRevs.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  catBreakEl.innerHTML = sorted.map(([catId, amt]) => {
    const cat = getCategoryById(catId);
    const pct = monthTotal > 0 ? Math.round(amt / monthTotal * 100) : 0;
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
