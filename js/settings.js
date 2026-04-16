'use strict';

function applyDarkMode(enabled) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  localStorage.setItem('rm-theme', enabled ? 'dark' : 'light');
}

function loadTheme() {
  const saved  = localStorage.getItem('rm-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = saved === 'dark';
}

function confirmResetData() {
  confirmDelete(
    'Supprimer TOUS les revenus et remettre les catégories par défaut ? Cette action est irréversible.',
    async () => {
      try {
        await resetAllData();
        document.getElementById('filter-category').innerHTML =
          '<option value="">Toutes catégories</option>';
        showToast('Données réinitialisées');
        navigate('dashboard');
      } catch { showToast('Erreur lors de la réinitialisation', 'error'); }
    }
  );
}
