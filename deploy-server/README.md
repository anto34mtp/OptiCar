# Historique Voiture - Serveur

## Déploiement rapide

```bash
# 1. Configurer l'environnement
cp .env.example .env
nano .env  # Remplir les valeurs

# 2. Lancer
docker compose up -d --build

# 3. (Optionnel) SSL avec Certbot
certbot --nginx -d dev-voiture.delgehier.com
```

## Structure

```
deploy-server/
├── api/                 # API NestJS
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── package.json
├── web/                 # Frontend React
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Variables d'environnement (.env)

| Variable | Description |
|----------|-------------|
| `DB_ROOT_PASSWORD` | Mot de passe root MariaDB |
| `DB_NAME` | Nom de la base (historique_voiture) |
| `DB_USER` | Utilisateur de l'app |
| `DB_PASSWORD` | Mot de passe de l'app |
| `JWT_SECRET` | Clé secrète JWT (min 32 chars) |
| `OLLAMA_URL` | URL de l'instance Ollama |
| `WEB_PORT` | Port web (défaut: 80) |

## Commandes utiles

```bash
# Logs
docker compose logs -f

# Redémarrer
docker compose restart

# Mise à jour
git pull && docker compose up -d --build

# Backup DB
docker compose exec db mysqldump -u root -p historique_voiture > backup.sql
```
