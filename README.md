# Revenue Manager

Une application web pour gérer et visualiser tes revenus personnels.

🔗 **Application en ligne** : [https://revenue-manager.onrender.com](https://revenue-manager.onrender.com)

## Fonctionnalités

- Ajouter, modifier et supprimer des revenus
- Catégoriser les revenus (Salaire, Freelance, Investissements, etc.)
- Tableau de bord avec statistiques et graphiques
- Export en PDF
- Gestion des catégories personnalisées

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python / Flask |
| Base de données | PostgreSQL (prod) / SQLite (local) |
| Frontend | HTML, CSS, JavaScript vanilla |
| UI | Bootstrap 5 + Chart.js |
| Hébergement | Render |

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

Variables d'environnement requises :

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `SECRET_KEY` | Clé secrète Flask |
