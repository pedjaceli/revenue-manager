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
    t('confirm_reset_data'),
    async () => {
      try {
        await resetAllData();
        document.getElementById('filter-category').innerHTML =
          `<option value="">${t('filter_all_categories')}</option>`;
        showToast(t('toast_reset_done'));
        navigate('dashboard');
      } catch { showToast(t('toast_reset_error'), 'error'); }
    }
  );
}
