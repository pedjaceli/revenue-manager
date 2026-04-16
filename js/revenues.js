'use strict';

function renderRevenueList() {
  _populateFilterDropdowns();

  const search = document.getElementById('search-input').value.toLowerCase();
  const catF   = document.getElementById('filter-category').value;
  const monthF = document.getElementById('filter-month').value;
  const yearF  = document.getElementById('filter-year').value;

  let filtered = db.revenues.filter(r => {
    const [y, m] = r.date.split('-');
    if (catF   && r.category !== catF)  return false;
    if (yearF  && y !== yearF)           return false;
    if (monthF && m !== monthF)          return false;
    if (search) {
      const hay = [r.description, r.notes || '', String(r.amount)].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const total = filtered.reduce((a, r) => a + r.amount, 0);
  document.getElementById('revenue-count').textContent          = `${filtered.length} entrée(s)`;
  document.getElementById('revenue-total-filtered').textContent = filtered.length > 0 ? `Total : ${fmt(total)}` : '';

  const container = document.getElementById('revenue-table-container');
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-search"></i>
        <p>Aucun revenu ne correspond aux filtres</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead><tr>
          <th>Date</th><th>Description</th><th>Catégorie</th>
          <th>Montant</th><th>Notes</th><th class="text-end">Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.map(r => {
            const cat = getCategoryById(r.category);
            return `<tr>
              <td class="text-muted small text-nowrap">${fmtDate(r.date)}</td>
              <td class="fw-semibold">${escHtml(r.description)}</td>
              <td><span class="cat-badge" style="background:${cat.color}22; color:${cat.color};">
                ${cat.icon} ${escHtml(cat.name)}
              </span></td>
              <td class="amount-cell">${fmt(r.amount)}</td>
              <td class="text-muted small">${escHtml(r.notes || '—')}</td>
              <td class="text-end text-nowrap">
                <button class="btn btn-outline-secondary btn-sm me-1"
                        onclick="openEditModal('${r.id}')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm"
                        onclick="askDeleteRevenue('${r.id}')">
                  <i class="bi bi-trash3"></i>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function _populateFilterDropdowns() {
  const catSel = document.getElementById('filter-category');
  if (catSel.options.length <= 1) {
    db.categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = `${c.icon} ${c.name}`;
      catSel.appendChild(o);
    });
  }
  const yearSel = document.getElementById('filter-year');
  if (yearSel.options.length <= 1) {
    [...new Set(db.revenues.map(r => r.date.slice(0, 4)))].sort().reverse().forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y; yearSel.appendChild(o);
    });
  }
  const monthSel = document.getElementById('filter-month');
  if (monthSel.options.length <= 1) {
    MONTHS_FULL.forEach((m, i) => {
      const o = document.createElement('option');
      o.value = String(i + 1).padStart(2, '0'); o.textContent = m;
      monthSel.appendChild(o);
    });
  }
}

function clearFilters() {
  document.getElementById('search-input').value    = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-month').value    = '';
  document.getElementById('filter-year').value     = '';
  renderRevenueList();
}

function askDeleteRevenue(id) {
  const r = db.revenues.find(x => x.id === id);
  if (!r) return;
  confirmDelete(
    `Supprimer "${r.description}" (${fmt(r.amount)}) du ${fmtDate(r.date)} ?`,
    async () => {
      try {
        await deleteRevenue(id);
        showToast('Revenu supprimé');
        refreshCurrentPage();
      } catch { showToast('Erreur lors de la suppression', 'error'); }
    }
  );
}

async function submitRevenue() {
  const amount = parseFloat(document.getElementById('f-amount').value);
  const date   = document.getElementById('f-date').value;
  const desc   = document.getElementById('f-desc').value.trim();
  const cat    = document.getElementById('f-cat').value;
  const notes  = document.getElementById('f-notes').value.trim();

  clearRevenueErrors();
  let valid = true;
  if (isNaN(amount) || amount <= 0) { setFieldError('amount', 'Montant invalide (> 0)'); valid = false; }
  if (!date)                         { setFieldError('date',   'Date requise');            valid = false; }
  if (!desc)                         { setFieldError('desc',   'Description requise');     valid = false; }
  if (!cat)                          { setFieldError('cat',    'Catégorie requise');        valid = false; }
  if (!valid) return;

  const btn = document.getElementById('revenueSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sauvegarde…';

  try {
    if (editingRevenueId) {
      await updateRevenue(editingRevenueId, { amount, date, description: desc, category: cat, notes });
      showToast('Revenu mis à jour');
    } else {
      await addRevenue({ amount, date, description: desc, category: cat, notes });
      showToast('Revenu ajouté');
    }
    bsRevenueModal.hide();
    refreshCurrentPage();
  } catch {
    showToast('Erreur lors de la sauvegarde', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingRevenueId ? 'Mettre à jour' : 'Enregistrer';
  }
}
