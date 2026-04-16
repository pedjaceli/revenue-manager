'use strict';

function renderCategoryList() {
  const used = new Set(db.revenues.map(r => r.category));
  const el   = document.getElementById('category-list');

  if (db.categories.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-tags"></i><p>Aucune catégorie</p></div>`;
    return;
  }

  el.innerHTML = db.categories.map(c => {
    const count     = db.revenues.filter(r => r.category === c.id).length;
    const canDelete = !used.has(c.id);
    return `
      <div class="cat-row">
        <span class="cat-emoji">${c.icon}</span>
        <div class="cat-dot" style="background:${c.color};"></div>
        <span class="cat-name">${escHtml(c.name)}</span>
        <span class="cat-count">${count} revenu(s)</span>
        <button class="btn btn-outline-secondary btn-sm me-1"
                onclick="openEditCategoryModal('${c.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        ${canDelete
          ? `<button class="btn btn-outline-danger btn-sm"
                     onclick="askDeleteCategory('${c.id}')">
               <i class="bi bi-trash3"></i>
             </button>`
          : `<button class="btn btn-outline-secondary btn-sm" disabled>
               <i class="bi bi-trash3"></i>
             </button>`
        }
      </div>`;
  }).join('');
}

async function submitCategory() {
  const name  = document.getElementById('cf-name').value.trim();
  const icon  = document.getElementById('cf-icon').value.trim() || '📦';
  const color = document.getElementById('cf-color').value;

  clearCategoryErrors();
  if (!name) {
    document.getElementById('cf-name').classList.add('is-invalid');
    document.getElementById('ce-name').textContent = 'Nom requis';
    return;
  }

  const btn = document.getElementById('categorySubmitBtn');
  btn.disabled = true;

  try {
    if (editingCategoryId) {
      await updateCategory(editingCategoryId, { name, icon, color });
      showToast('Catégorie mise à jour');
    } else {
      await addCategory({ name, icon, color });
      showToast('Catégorie créée');
    }
    bsCategoryModal.hide();
    renderCategoryList();
    _resetCategoryFilter();
  } catch {
    showToast('Erreur lors de la sauvegarde', 'error');
  } finally {
    btn.disabled = false;
  }
}

function askDeleteCategory(id) {
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  confirmDelete(`Supprimer la catégorie "${c.name}" ?`, async () => {
    try {
      await deleteCategory(id);
      showToast('Catégorie supprimée');
      renderCategoryList();
      _resetCategoryFilter();
    } catch { showToast('Erreur lors de la suppression', 'error'); }
  });
}

function _resetCategoryFilter() {
  document.getElementById('filter-category').innerHTML =
    '<option value="">Toutes catégories</option>';
}
