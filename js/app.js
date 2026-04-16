'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Bootstrap modals ──────────────────────────────────────
  bsRevenueModal  = new bootstrap.Modal(document.getElementById('revenueModal'));
  bsCategoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
  bsConfirmModal  = new bootstrap.Modal(document.getElementById('confirmModal'));

  // ── Thème sauvegardé ──────────────────────────────────────
  loadTheme();

  // ── Chargement des données depuis l'API Flask ─────────────
  await loadDB();

  // ── Rendu initial ─────────────────────────────────────────
  renderDashboard();

});
