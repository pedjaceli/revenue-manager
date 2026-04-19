'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Bootstrap modals ──────────────────────────────────────
  bsConfirmModal    = new bootstrap.Modal(document.getElementById('confirmModal'));
  bsInvoiceModal    = new bootstrap.Modal(document.getElementById('invoiceModal'));
  bsPriceModal      = new bootstrap.Modal(document.getElementById('priceModal'));
  bsStoreModal      = new bootstrap.Modal(document.getElementById('storeModal'));
  bsInvModal        = new bootstrap.Modal(document.getElementById('invModal'));
  bsListModal       = new bootstrap.Modal(document.getElementById('listModal'));
  bsItemModal       = new bootstrap.Modal(document.getElementById('itemModal'));
  bsScanModal       = new bootstrap.Modal(document.getElementById('scanModal'));

  document.getElementById('scanModal').addEventListener('show.bs.modal',  () => bsScanModal_onShow());
  document.getElementById('scanModal').addEventListener('hidden.bs.modal', () => onScanModalHide());

  // ── Langue sauvegardée ────────────────────────────────────
  initLanguage();

  // ── Thème sauvegardé ──────────────────────────────────────
  loadTheme();

  // ── Nom utilisateur connecté ──────────────────────────────
  const username = await loadCurrentUser();
  if (username) setOnboardingUser(username);

  // ── Chargement des données depuis l'API Flask ─────────────
  await loadDB();

  // ── Désactiver l'autocomplétion du navigateur sur tous les champs
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (!el.hasAttribute('autocomplete')) {
      el.setAttribute('autocomplete', el.type === 'password' ? 'new-password' : 'off');
    }
  });

  // ── Vider les champs que le navigateur pourrait auto-remplir
  document.querySelectorAll('input[type="text"], input[type="search"], input[type="password"], input[type="email"]').forEach(el => {
    el.value = '';
  });
  // Re-vider après un court délai car certains navigateurs auto-remplissent après DOMContentLoaded
  setTimeout(() => {
    document.querySelectorAll('input[type="password"]').forEach(el => { el.value = ''; });
  }, 100);

  // ── Rendu initial ─────────────────────────────────────────
  renderDashboard();

  // ── Guide de démarrage (première connexion) ───────────────
  checkOnboarding();

});
