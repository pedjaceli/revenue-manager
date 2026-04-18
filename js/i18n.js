'use strict';

// ─── Translations ─────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    // Navigation
    nav_dashboard:   'Dashboard',
    nav_revenues:    'Revenus',
    nav_charts:      'Graphiques',
    nav_categories:  'Catégories',
    nav_export:      'Export',
    nav_settings:    'Paramètres',
    nav_users:       'Utilisateurs',

    // Topbar
    btn_add_revenue: 'Ajouter un revenu',

    // Dashboard
    stat_this_month:  'Ce mois-ci',
    stat_this_year:   'Cette année',
    stat_all_time:    'Total cumulé',
    stat_monthly_avg: 'Moyenne mensuelle',
    stat_entries:     'entrée(s)',
    section_recent:   'Derniers revenus',
    section_breakdown:'Répartition ce mois',
    col_date:         'Date',
    col_description:  'Description',
    col_category:     'Catégorie',
    col_amount:       'Montant',
    col_notes:        'Notes',
    col_actions:      'Actions',
    empty_no_revenue: 'Aucun revenu enregistré',
    empty_no_data:    'Aucune donnée ce mois',
    pct_of_total:     '% du total',
    view_all:         'Voir tous les revenus',

    // Revenues page
    filter_all_categories: 'Toutes catégories',
    filter_all_months:     'Tous les mois',
    filter_all_years:      'Toutes les années',
    btn_clear_filters:     'Effacer',
    empty_no_match:        'Aucun revenu ne correspond aux filtres',
    total_label:           'Total',

    // Revenue modal
    modal_add_revenue:    'Ajouter un revenu',
    modal_edit_revenue:   'Modifier le revenu',
    label_amount:         'Montant',
    label_category:       'Catégorie',
    label_description:    'Description',
    label_date:           'Date',
    label_notes:          'Notes (optionnel)',
    btn_save:             'Enregistrer',
    btn_update:           'Mettre à jour',
    btn_cancel:           'Annuler',
    btn_delete:           'Supprimer',
    err_amount:           'Montant invalide (> 0)',
    err_date:             'Date requise',
    err_desc:             'Description requise',
    err_cat:              'Catégorie requise',
    saving:               'Sauvegarde…',

    // Categories
    section_categories:   'Mes catégories',
    btn_add_category:     '+ Nouvelle catégorie',
    modal_add_category:   'Nouvelle catégorie',
    modal_edit_category:  'Modifier la catégorie',
    label_cat_name:       'Nom',
    label_cat_icon:       'Icône (emoji)',
    label_cat_color:      'Couleur',
    btn_create:           'Créer',
    cat_revenue_count:    'revenu(s)',
    err_cat_name:         'Nom requis',
    empty_no_categories:  'Aucune catégorie',

    // Charts
    chart_monthly_title:  'Revenus mensuels',
    chart_by_category:    'Par catégorie',
    chart_trend:          'Tendance sur 12 mois',
    chart_no_data:        'Aucune donnée disponible',

    // Export
    export_summary_title: 'Résumé',
    export_total_entries: 'Total entrées',
    export_total_amount:  'Total cumulé',
    export_this_year:     'Cette année',
    export_this_month:    'Ce mois',
    export_categories:    'Catégories',
    export_csv_title:     'Exporter en CSV',
    export_pdf_title:     'Exporter en PDF',
    export_period:        'Période',
    period_all:           'Toutes les données',
    period_year:          'Cette année',
    period_month:         'Ce mois',
    btn_export_csv:       'Télécharger CSV',
    btn_export_pdf:       'Télécharger PDF',

    // Settings
    settings_appearance:  'Apparence',
    settings_dark_mode:   'Mode sombre',
    settings_dark_desc:   'Réduit la luminosité de l\'interface',
    settings_language:    'Langue',
    settings_lang_desc:   'Choisir la langue de l\'interface',
    settings_data:        'Données',
    settings_reset:       'Réinitialiser les données',
    settings_reset_desc:  'Supprime tous les revenus et catégories personnalisées',
    btn_reset:            'Réinitialiser',
    settings_help:        'Aide',
    settings_guide:       'Guide de démarrage',
    settings_guide_desc:  'Revoir le tutoriel de prise en main',
    btn_launch:           'Lancer',
    settings_about:       'À propos',
    settings_version:     'Version',
    settings_storage:     'Stockage',
    settings_storage_desc:'Données sauvegardées dans le cloud',

    // Users
    users_title:          'Gestion des utilisateurs',
    btn_add_user:         'Ajouter',
    col_username:         'Nom d\'utilisateur',
    col_created:          'Créé le',
    modal_add_user:       'Ajouter un utilisateur',
    label_username:       'Nom d\'utilisateur',
    label_password:       'Mot de passe',
    label_confirm_pwd:    'Confirmer le mot de passe',
    users_change_pwd:     'Changer mon mot de passe',
    label_new_pwd:        'Nouveau mot de passe',
    btn_save_pwd:         'Enregistrer',
    pwd_success:          'Mot de passe modifié avec succès !',
    users_loading:        'Chargement…',
    users_none:           'Aucun utilisateur',
    users_error:          'Erreur de chargement',
    users_me_badge:       'Moi',

    // Toasts
    toast_revenue_added:    'Revenu ajouté',
    toast_revenue_updated:  'Revenu mis à jour',
    toast_revenue_deleted:  'Revenu supprimé',
    toast_category_added:   'Catégorie créée',
    toast_category_updated: 'Catégorie mise à jour',
    toast_category_deleted: 'Catégorie supprimée',
    toast_user_created:     'Utilisateur créé avec succès !',
    toast_user_deleted:     'Utilisateur supprimé.',
    toast_no_data:          'Aucune donnée à exporter',
    toast_save_error:       'Erreur lors de la sauvegarde',
    toast_delete_error:     'Erreur lors de la suppression',
    toast_load_error:       'Impossible de charger les données',

    // Confirm modal
    confirm_delete:         'Supprimer ?',
    confirm_irreversible:   'Êtes-vous sûr ? Cette action est irréversible.',
    confirm_delete_revenue: 'Supprimer',
    confirm_delete_cat:     'Supprimer la catégorie',
    confirm_delete_user:    'Supprimer l\'utilisateur "{name}" ? Cette action est irréversible.',
    confirm_reset_data:     'Supprimer TOUS les revenus et remettre les catégories par défaut ? Cette action est irréversible.',
    toast_reset_done:       'Données réinitialisées',
    toast_reset_error:      'Erreur lors de la réinitialisation',

    // PDF
    pdf_report:             'Rapport',
    pdf_generated:          'Généré le',
    pdf_total:              'Total',
    pdf_by_category:        'Répartition par catégorie',
    pdf_detail:             'Détail des revenus',
    pdf_page:               'Page',

    // Dashboard extra
    stat_last_12:     '12 derniers mois',
    section_breakdown:'Par catégorie (ce mois)',
    view_all:         'Voir tout',
    chart_monthly_12: 'Revenus par mois (12 derniers mois)',
    chart_by_category:'Répartition par catégorie',
    chart_yearly:     'Évolution annuelle',

    // Categories extra
    btn_new_category: 'Nouvelle catégorie',
    cat_info_title:   'Info',
    cat_info_text1:   'Les catégories permettent de classer vos revenus et d\'analyser leur répartition dans les graphiques.',
    cat_info_text2:   'Une catégorie utilisée par un revenu ne peut pas être supprimée.',

    // Export extra
    export_csv_compat:'Compatible Excel, Google Sheets, LibreOffice…',
    export_pdf_desc:  'Rapport complet avec tableau et résumé par catégorie.',
    btn_export_pdf:   'Télécharger PDF',

    // Search
    search_placeholder: 'Rechercher…',

    // Placeholders
    desc_placeholder:     'Ex: Salaire janvier, Mission freelance…',
    notes_placeholder:    'Informations complémentaires…',
    cat_name_placeholder: 'Ex: Dividendes, Bonus…',
    password_placeholder: 'Min. 6 caractères',

    // Onboarding
    ob_welcome_title:  'Bienvenue sur Revenue Manager !',
    ob_welcome_text:   "Cette application te permet de suivre et d'analyser tous tes revenus en un seul endroit. Ce guide rapide va t'expliquer comment démarrer.",
    ob_feat_revenues:  'Revenus',
    ob_feat_charts:    'Graphiques',
    ob_feat_categories:'Catégories',
    ob_step1_title:    'Étape 1 — Les Catégories',
    ob_step1_text:     'Les catégories permettent d\'organiser tes revenus. Voici un ensemble de catégories que vous pouvez utiliser :',
    ob_step1_tip:      'Tu peux créer tes propres catégories dans la section <strong>Catégories</strong>.',
    ob_cat_salary:     'Salaire',
    ob_cat_freelance:  'Freelance',
    ob_cat_investment: 'Investissements',
    ob_cat_rental:     'Loyer reçu',
    ob_step2_title:    'Étape 2 — Ajouter un revenu',
    ob_step2_text:     'Pour enregistrer un revenu, clique sur le bouton <strong>"Ajouter un revenu"</strong> en haut à droite.',
    ob_step2_s1:       'Saisis le <strong>montant</strong>',
    ob_step2_s2:       'Choisis une <strong>catégorie</strong>',
    ob_step2_s3:       'Ajoute une <strong>description</strong>',
    ob_step2_s4:       'Sélectionne la <strong>date</strong>',
    ob_step2_s5:       'Clique <strong>Enregistrer</strong> ✅',
    ob_step3_title:    'Étape 3 — Analyser tes revenus',
    ob_step3_text:     "Une fois tes revenus ajoutés, deux sections t'aident à les analyser :",
    ob_dash_desc:      'Résumé du mois, total annuel, dernières entrées',
    ob_charts_desc:    'Évolution mensuelle, répartition par catégorie',
    ob_step4_title:    'Tu es prêt !',
    ob_step4_p1:       'Tu peux aussi <strong>exporter</strong> tes données en PDF ou CSV depuis la section Export.',
    ob_step4_p2:       'Si tu as besoin de revoir ce guide, tu peux le relancer depuis <strong>Paramètres → Guide de démarrage</strong>.',
    ob_step4_tip:      'Bonne gestion de tes revenus !',
    ob_btn_skip:       'Passer',
    ob_btn_next:       'Suivant',
    ob_btn_start:      'Commencer',

    // Months
    months: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    months_short: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'],
  },

  en: {
    // Navigation
    nav_dashboard:   'Dashboard',
    nav_revenues:    'Revenues',
    nav_charts:      'Charts',
    nav_categories:  'Categories',
    nav_export:      'Export',
    nav_settings:    'Settings',
    nav_users:       'Users',

    // Topbar
    btn_add_revenue: 'Add revenue',

    // Dashboard
    stat_this_month:  'This month',
    stat_this_year:   'This year',
    stat_all_time:    'All time',
    stat_monthly_avg: 'Monthly average',
    stat_entries:     'entry(ies)',
    section_recent:   'Recent revenues',
    section_breakdown:'This month breakdown',
    col_date:         'Date',
    col_description:  'Description',
    col_category:     'Category',
    col_amount:       'Amount',
    col_notes:        'Notes',
    col_actions:      'Actions',
    empty_no_revenue: 'No revenues recorded',
    empty_no_data:    'No data this month',
    pct_of_total:     '% of total',
    view_all:         'View all revenues',

    // Revenues page
    filter_all_categories: 'All categories',
    filter_all_months:     'All months',
    filter_all_years:      'All years',
    btn_clear_filters:     'Clear',
    empty_no_match:        'No revenues match the filters',
    total_label:           'Total',

    // Revenue modal
    modal_add_revenue:    'Add revenue',
    modal_edit_revenue:   'Edit revenue',
    label_amount:         'Amount',
    label_category:       'Category',
    label_description:    'Description',
    label_date:           'Date',
    label_notes:          'Notes (optional)',
    btn_save:             'Save',
    btn_update:           'Update',
    btn_cancel:           'Cancel',
    btn_delete:           'Delete',
    err_amount:           'Invalid amount (> 0)',
    err_date:             'Date required',
    err_desc:             'Description required',
    err_cat:              'Category required',
    saving:               'Saving…',

    // Categories
    section_categories:   'My categories',
    btn_add_category:     '+ New category',
    modal_add_category:   'New category',
    modal_edit_category:  'Edit category',
    label_cat_name:       'Name',
    label_cat_icon:       'Icon (emoji)',
    label_cat_color:      'Color',
    btn_create:           'Create',
    cat_revenue_count:    'revenue(s)',
    err_cat_name:         'Name required',
    empty_no_categories:  'No categories',

    // Charts
    chart_monthly_title:  'Monthly revenues',
    chart_by_category:    'By category',
    chart_trend:          '12-month trend',
    chart_no_data:        'No data available',

    // Export
    export_summary_title: 'Summary',
    export_total_entries: 'Total entries',
    export_total_amount:  'Total amount',
    export_this_year:     'This year',
    export_this_month:    'This month',
    export_categories:    'Categories',
    export_csv_title:     'Export as CSV',
    export_pdf_title:     'Export as PDF',
    export_period:        'Period',
    period_all:           'All data',
    period_year:          'This year',
    period_month:         'This month',
    btn_export_csv:       'Download CSV',
    btn_export_pdf:       'Download PDF',

    // Settings
    settings_appearance:  'Appearance',
    settings_dark_mode:   'Dark mode',
    settings_dark_desc:   'Reduces interface brightness',
    settings_language:    'Language',
    settings_lang_desc:   'Choose the interface language',
    settings_data:        'Data',
    settings_reset:       'Reset data',
    settings_reset_desc:  'Deletes all revenues and custom categories',
    btn_reset:            'Reset',
    settings_help:        'Help',
    settings_guide:       'Getting started guide',
    settings_guide_desc:  'Review the onboarding tutorial',
    btn_launch:           'Launch',
    settings_about:       'About',
    settings_version:     'Version',
    settings_storage:     'Storage',
    settings_storage_desc:'Data saved in the cloud',

    // Users
    users_title:          'User management',
    btn_add_user:         'Add',
    col_username:         'Username',
    col_created:          'Created',
    modal_add_user:       'Add a user',
    label_username:       'Username',
    label_password:       'Password',
    label_confirm_pwd:    'Confirm password',
    users_change_pwd:     'Change my password',
    label_new_pwd:        'New password',
    btn_save_pwd:         'Save',
    pwd_success:          'Password changed successfully!',
    users_loading:        'Loading…',
    users_none:           'No users',
    users_error:          'Loading error',
    users_me_badge:       'Me',

    // Toasts
    toast_revenue_added:    'Revenue added',
    toast_revenue_updated:  'Revenue updated',
    toast_revenue_deleted:  'Revenue deleted',
    toast_category_added:   'Category created',
    toast_category_updated: 'Category updated',
    toast_category_deleted: 'Category deleted',
    toast_user_created:     'User created successfully!',
    toast_user_deleted:     'User deleted.',
    toast_no_data:          'No data to export',
    toast_save_error:       'Error while saving',
    toast_delete_error:     'Error while deleting',
    toast_load_error:       'Unable to load data',

    // Confirm modal
    confirm_delete:         'Delete?',
    confirm_irreversible:   'Are you sure? This action cannot be undone.',
    confirm_delete_revenue: 'Delete',
    confirm_delete_cat:     'Delete category',
    confirm_delete_user:    'Delete user "{name}"? This action cannot be undone.',
    confirm_reset_data:     'Delete ALL revenues and reset categories to defaults? This action cannot be undone.',
    toast_reset_done:       'Data reset successfully',
    toast_reset_error:      'Error during reset',

    // PDF
    pdf_report:             'Report',
    pdf_generated:          'Generated on',
    pdf_total:              'Total',
    pdf_by_category:        'Breakdown by category',
    pdf_detail:             'Revenue details',
    pdf_page:               'Page',

    // Dashboard extra
    stat_last_12:     'Last 12 months',
    section_breakdown:'By category (this month)',
    view_all:         'View all',
    chart_monthly_12: 'Revenue by month (last 12 months)',
    chart_by_category:'By category',
    chart_yearly:     'Annual trend',

    // Categories extra
    btn_new_category: 'New category',
    cat_info_title:   'Info',
    cat_info_text1:   'Categories allow you to classify your revenues and analyze their distribution in charts.',
    cat_info_text2:   'A category used by a revenue cannot be deleted.',

    // Export extra
    export_csv_compat:'Compatible with Excel, Google Sheets, LibreOffice…',
    export_pdf_desc:  'Full report with table and category breakdown.',
    btn_export_pdf:   'Download PDF',

    // Search
    search_placeholder: 'Search…',

    // Placeholders
    desc_placeholder:     'Ex: January salary, Freelance mission…',
    notes_placeholder:    'Additional information…',
    cat_name_placeholder: 'Ex: Dividends, Bonus…',
    password_placeholder: 'Min. 6 characters',

    // Onboarding
    ob_welcome_title:  'Welcome to Revenue Manager!',
    ob_welcome_text:   'This app lets you track and analyze all your income in one place. This quick guide will show you how to get started.',
    ob_feat_revenues:  'Revenues',
    ob_feat_charts:    'Charts',
    ob_feat_categories:'Categories',
    ob_step1_title:    'Step 1 — Categories',
    ob_step1_text:     'Categories help you organize your income. Here are some categories you can use:',
    ob_step1_tip:      'You can create your own categories in the <strong>Categories</strong> section.',
    ob_cat_salary:     'Salary',
    ob_cat_freelance:  'Freelance',
    ob_cat_investment: 'Investments',
    ob_cat_rental:     'Rental income',
    ob_step2_title:    'Step 2 — Add a revenue',
    ob_step2_text:     'To record a revenue, click the <strong>"Add revenue"</strong> button at the top right.',
    ob_step2_s1:       'Enter the <strong>amount</strong>',
    ob_step2_s2:       'Choose a <strong>category</strong>',
    ob_step2_s3:       'Add a <strong>description</strong>',
    ob_step2_s4:       'Select the <strong>date</strong>',
    ob_step2_s5:       'Click <strong>Save</strong> ✅',
    ob_step3_title:    'Step 3 — Analyze your revenues',
    ob_step3_text:     'Once your revenues are added, two sections help you analyze them:',
    ob_dash_desc:      'Monthly summary, annual total, latest entries',
    ob_charts_desc:    'Monthly trend, breakdown by category',
    ob_step4_title:    'You are ready!',
    ob_step4_p1:       'You can also <strong>export</strong> your data as PDF or CSV from the Export section.',
    ob_step4_p2:       'If you need to review this guide, you can relaunch it from <strong>Settings → Getting started guide</strong>.',
    ob_step4_tip:      'Enjoy managing your revenues!',
    ob_btn_skip:       'Skip',
    ob_btn_next:       'Next',
    ob_btn_start:      'Get started',

    // Months
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    months_short: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  },
};

// ─── Current language ─────────────────────────────────────────
let currentLang = localStorage.getItem('rm-lang') || 'en';

// ─── Translate key ────────────────────────────────────────────
function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key])
    || (TRANSLATIONS['fr'][key])
    || key;
}

// ─── Apply to static HTML elements ───────────────────────────
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const val = t(key);
    if (val) el.innerHTML = val;
  });
}

// ─── Set language ─────────────────────────────────────────────
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('rm-lang', lang);
  applyTranslations();
  // Update lang selector UI
  const sel = document.getElementById('languageSelect');
  if (sel) sel.value = lang;
  // Re-render current page
  if (typeof refreshCurrentPage === 'function') refreshCurrentPage();
}

// ─── Init ─────────────────────────────────────────────────────
function initLanguage() {
  currentLang = localStorage.getItem('rm-lang') || 'fr';
  applyTranslations();
  const sel = document.getElementById('languageSelect');
  if (sel) sel.value = currentLang;
}
