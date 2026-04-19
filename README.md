# Grocery Manager

Une application web pour gérer ton épicerie au quotidien : listes de courses, inventaire, suivi des prix, factures et budget.

🔗 **Application en ligne** : [https://grocery-manager.onrender.com](https://grocery-manager.onrender.com)

## Fonctionnalités

### Tableau de bord & Budget
- Vue d'ensemble du mois en cours : dépenses, budget restant, progression
- Budget épicerie mensuel personnalisable
- Dernières dépenses et répartition par catégorie
- Statistiques : ce mois, cette année, total cumulé, moyenne mensuelle

### Listes de courses
- Créer plusieurs listes de courses nommées
- Ajouter des articles avec quantité, unité et prix estimé
- Cocher les articles achetés pendant les courses
- **Scanner de codes-barres** (caméra du téléphone, via ZXing) pour ajouter rapidement un produit
- Auto-complétion basée sur l'historique

### Inventaire & Emplacements
- Suivre les produits que tu as en stock avec quantité et unité
- **Emplacements personnalisés** (frigo, congélateur, garde-manger…) pour organiser l'inventaire
- Dates de péremption et alertes

### Suivi des prix
- Enregistrer le prix d'un produit dans différents magasins
- Comparer facilement pour trouver le meilleur prix
- Historique par produit et par magasin

### Dépenses & Factures
- **Factures** nommées avec plusieurs articles (produit, quantité, prix), calculs automatiques
- **Scan de reçu par IA** : prends une photo du ticket de caisse, Claude (Anthropic) extrait automatiquement le titre, la date et les articles
- **Dépenses simples** : saisie rapide avec montant, catégorie, description et date
- **Par produit** : agrégation de tous les achats avec quantités, montants et répartition
- Catégories personnalisées (nom, icône, couleur)

### Utilisateurs
- Authentification (inscription / connexion / déconnexion)
- Réinitialisation de mot de passe via le nom d'utilisateur
- Changement de mot de passe depuis les Paramètres
- Données isolées par utilisateur
- Gestion multi-utilisateurs (admin)

### Interface
- Bilingue français / anglais (persisté en localStorage)
- Mode sombre
- Design responsive optimisé pour petits, moyens et grands écrans (320px → desktop)
- Navigation par bouton "Retour" du téléphone entre les onglets
- Modal d'accueil personnalisé (Bonjour / Bon après-midi / Bonsoir + nom d'utilisateur)
- Guide de démarrage interactif en 7 étapes
- Garder l'écran allumé sur mobile/tablette (Web Wake Lock API)
- Export CSV et PDF

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python / Flask |
| Base de données | PostgreSQL (prod) / SQLite (local) |
| Frontend | HTML, CSS, JavaScript vanilla (SPA) |
| UI | Bootstrap 5 + Bootstrap Icons + Chart.js |
| IA / OCR reçus | Anthropic Claude (vision) |
| Scan codes-barres | ZXing (@zxing/browser) |
| PDF | jsPDF + jsPDF-AutoTable |
| Hébergement | Render |

## Structure du projet

```
grocery-manager/
├── app.py               # Routes Flask + API REST + endpoint /api/invoices/scan-receipt
├── models.py            # Modèles SQLAlchemy
├── requirements.txt
├── index.html           # SPA principale
├── css/
│   └── style.css
├── js/
│   ├── i18n.js          # Système de traduction FR/EN
│   ├── db.js            # Cache in-memory + appels API
│   ├── utils.js         # Helpers (formatage, dates…)
│   ├── ui.js            # Navigation, modals, toasts, popstate
│   ├── app.js           # Point d'entrée (DOMContentLoaded)
│   ├── dashboard.js     # Tableau de bord & budget
│   ├── shopping.js      # Listes de courses + scanner codes-barres
│   ├── inventory.js     # Inventaire & emplacements
│   ├── prices.js        # Suivi des prix par magasin
│   ├── expenses.js      # Factures + dépenses + scan IA du reçu
│   ├── revenues.js      # Revenus (legacy)
│   ├── categories.js    # Catégories
│   ├── charts.js        # Graphiques Chart.js
│   ├── export.js        # Export CSV / PDF
│   ├── settings.js      # Paramètres
│   ├── users.js         # Gestion des utilisateurs
│   └── onboarding.js    # Modal d'accueil + guide de démarrage
└── templates/
    ├── login.html
    ├── register.html
    └── forgot-password.html
```

## Lancer en local

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer l'application
python app.py
```

L'app sera disponible sur [http://localhost:5000](http://localhost:5000).

## Déploiement

L'application est déployée sur [Render](https://render.com) avec une base de données PostgreSQL.

Variables d'environnement :

| Variable | Description | Requise |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | ✅ |
| `SECRET_KEY` | Clé secrète Flask | ✅ |
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour le scan de reçu par IA | Optionnelle (désactive le scan si absente) |
