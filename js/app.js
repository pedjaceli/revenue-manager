'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Bootstrap modals ──────────────────────────────────────
  bsRevenueModal   = new bootstrap.Modal(document.getElementById('revenueModal'));
  bsCategoryModal  = new bootstrap.Modal(document.getElementById('categoryModal'));
  bsConfirmModal   = new bootstrap.Modal(document.getElementById('confirmModal'));
  bsInvoiceModal   = new bootstrap.Modal(document.getElementById('invoiceModal'));
  bsExpenseModal   = new bootstrap.Modal(document.getElementById('expenseModal'));
  bsExpenseCatModal = new bootstrap.Modal(document.getElementById('expenseCatModal'));

  // ── Langue sauvegardée ────────────────────────────────────
  initLanguage();

  // ── Thème sauvegardé ──────────────────────────────────────
  loadTheme();

  // ── Nom utilisateur connecté ──────────────────────────────
  const username = await loadCurrentUser();
  if (username) setOnboardingUser(username);

  // ── Chargement des données depuis l'API Flask ─────────────
  await loadDB();

  // ── Vider les champs que le navigateur pourrait auto-remplir
  document.querySelectorAll('input[type="text"], input[type="search"]').forEach(el => {
    el.value = '';
  });

  // ── Rendu initial ─────────────────────────────────────────
  renderDashboard();

  // ── Guide de démarrage (première connexion) ───────────────
  checkOnboarding();

});
