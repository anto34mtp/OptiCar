# OptiCar — Environnement DEV

> Suivi intelligent de véhicules : carburant, entretien, assurance, coûts.

---

## Architecture

```
Opticar/dev/
├── deploy-server/
│   ├── api/          # Backend NestJS + Prisma (MySQL)
│   ├── web/          # Frontend React/Vite (Tailwind CSS)
│   ├── docker-compose.yml
│   ├── .env          # Variables d'environnement DEV (NE PAS COMMITTER)
│   └── .env.example  # Template des variables
└── deploy-android/   # App mobile React Native (Expo)
```

**Stack technique :**
- **Backend** : NestJS, Prisma ORM, MariaDB 10.11, JWT
- **Web** : React 18, Vite, TanStack Query, Tailwind CSS
- **Mobile** : React Native, Expo, TanStack Query, Zustand
- **OCR** : Ollama (analyse de tickets carburant/entretien)
- **Email** : Nodemailer (SMTP configurable)
- **Infra** : Docker Compose

---

## Prérequis

- Docker & Docker Compose
- Node.js 20+
- Expo CLI (`npm install -g expo-cli`) pour le mobile
- Un compte SMTP pour les emails de reset password

---

## Lancement en DEV

### 1. Configurer l'environnement

```bash
cd deploy-server
cp .env.example .env
# Editer .env avec vos valeurs
```

Variables à renseigner dans `.env` :

| Variable | Description |
|---|---|
| `DOMAIN` | Domaine DEV (ex: `voiture-dev.delgehier.com`) |
| `DB_ROOT_PASSWORD` | Mot de passe root MariaDB |
| `DB_NAME` | Nom de la base de données |
| `DB_USER` | Utilisateur BDD |
| `DB_PASSWORD` | Mot de passe BDD |
| `JWT_SECRET` | Secret JWT (minimum 32 chars) |
| `SMTP_HOST` | Serveur SMTP (ex: `smtp.gmail.com`) |
| `SMTP_PORT` | Port SMTP (587 = TLS, 465 = SSL) |
| `SMTP_USER` | Email expéditeur |
| `SMTP_PASS` | Mot de passe SMTP / App Password |
| `SMTP_FROM` | Adresse "From" de l'email |
| `OLLAMA_URL` | URL du serveur Ollama (OCR) |

> **Note SMTP** : Si SMTP n'est pas configuré, le lien de reset password s'affiche uniquement dans les logs du container API (mode développement).

### 2. Démarrer les services Web + API

```bash
cd deploy-server
docker-compose up -d --build
```

- Web : http://localhost (port 80)
- API : http://localhost/api (proxied par nginx)

### 3. Migration de base de données

La migration Prisma s'exécute automatiquement au démarrage du container API (`prisma db push`).

Pour appliquer manuellement :

```bash
docker exec historique-voiture-api npx prisma db push
```

### 4. Démarrer l'app mobile

```bash
cd deploy-android
npm install
npx expo start
```

Configurer l'URL de l'API dans `app.json` ou via la variable `EXPO_PUBLIC_API_URL`.

---

## Endpoints API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Profil utilisateur |
| POST | `/api/auth/forgot-password` | Demande de reset password |
| POST | `/api/auth/reset-password` | Réinitialisation du mot de passe |
| GET | `/api/vehicles` | Liste des véhicules |
| POST | `/api/vehicles` | Créer un véhicule |
| GET | `/api/vehicles/:id/stats` | Stats du véhicule |
| GET | `/api/vehicles/:id/maintenance/status` | État d'usure des pièces |
| GET | `/api/vehicles/:id/maintenance/predictions` | Prédictions d'entretien |
| POST | `/api/vehicles/:id/maintenance/scan` | Scanner une facture (OCR) |

---

## Changelog DEV — 04/03/2026

### Correction (Priorité Haute) — Bug notifications mobiles

**Problème :** Les switches de désactivation des notifications ne fonctionnaient pas. Malgré le décochage, les notifications planifiées (daily) continuaient d'être envoyées.

**Cause racine :**
1. Dans `MaintenanceScreen` et `VehicleMaintenanceScreen` : le code ne déclenchait `checkAndScheduleNotifications()` que lorsqu'on *activait* un switch (`if (val)`), jamais lors de la désactivation.
2. Dans `notifications.ts` : quand un véhicule ou un type de pièce était désactivé, le code faisait `continue` sans annuler les notifications déjà planifiées pour cet élément.

**Correction apportée :**
- `services/notifications.ts` : avant le `continue` sur un véhicule/partType désactivé, annulation explicite des notifications et nettoyage des flags AsyncStorage.
- `screens/MaintenanceScreen.tsx` : `onValueChange` rendu async, `checkAndScheduleNotifications()` appelé systématiquement (pas seulement à l'activation).
- `screens/VehicleMaintenanceScreen.tsx` : même correction pour le toggle véhicule et le toggle par type de pièce.

---

### Amélioration UX — Raccourci "Entretiens" depuis la fiche véhicule

**Web :** Ajout d'un bouton "Entretiens" dans l'en-tête de `VehicleDetailPage` qui redirige vers `/maintenance/:id`.

**Mobile :** Ajout d'un bouton vert "Entretiens" dans la section actions de `VehicleDetailScreen` qui navigue vers `VehicleMaintenance`.

---

### Nouvelle fonctionnalité — Récupération de mot de passe (Forgot Password)

**Backend (NestJS) :**
- Nouveau modèle Prisma `PasswordResetToken` (table `password_reset_tokens`) avec champs : `token`, `email`, `expiresAt`, `used`.
- `POST /api/auth/forgot-password` : génère un token unique (32 bytes hex), l'enregistre en BDD avec expiration 1h, envoie un email HTML via Nodemailer.
- `POST /api/auth/reset-password` : valide le token (existence, non-utilisé, non-expiré), hash le nouveau mot de passe avec bcrypt, marque le token comme utilisé.
- **Sécurité** : réponse identique que l'email existe ou non (anti-énumération). Les anciens tokens actifs sont invalidés à chaque nouvelle demande.
- Template email HTML responsive (`src/auth/templates/reset-password.html`) avec identité visuelle OptiCar.

**Web (React) :**
- `ForgotPasswordPage` (`/forgot-password`) : formulaire email avec état de succès.
- `ResetPasswordPage` (`/reset-password?token=...`) : saisie du nouveau mot de passe + confirmation, redirection automatique vers login.
- Lien "Mot de passe oublié ?" ajouté sur `LoginPage`.

**Mobile (React Native) :**
- `ForgotPasswordScreen` : formulaire email avec état de succès.
- Lien "Mot de passe oublié ?" ajouté sur `LoginScreen`.
- Screen ajouté dans `RootNavigator` (accessible sans authentification).

---

## Déploiement en PRODUCTION

> **Important** : Ne jamais modifier les fichiers dans `Opticar/prod/` directement depuis cette branche.

### Procédure recommandée (sans risque)

1. **Tester en DEV** : Valider toutes les fonctionnalités sur `voiture-dev.delgehier.com`

2. **Merger vers prod via Pull Request** :
   ```bash
   git checkout -b release/vX.Y.Z
   git merge dev
   # Ouvrir une PR vers la branche main/prod
   ```

3. **Migration BDD PROD** (critique — migration Prisma) :
   ```bash
   # Sur le serveur PROD, AVANT de redémarrer les containers :
   docker exec historique-voiture-api npx prisma db push
   ```
   > La nouvelle table `password_reset_tokens` sera créée. Aucune donnée existante n'est modifiée.

4. **Variables d'environnement PROD** à ajouter dans `.env` PROD :
   ```
   SMTP_HOST=votre-smtp-prod.com
   SMTP_PORT=587
   SMTP_USER=votre-email@domaine.com
   SMTP_PASS=votre-mot-de-passe
   SMTP_FROM=noreply@voiture.delgehier.com
   ```

5. **Rebuild et redémarrage PROD** :
   ```bash
   cd Opticar/prod/deploy-server
   docker-compose pull
   docker-compose up -d --build
   ```

6. **Vérification** :
   - Tester le flux "Mot de passe oublié" en PROD
   - Vérifier les notifications mobiles
   - Vérifier le bouton "Entretiens" dans la fiche véhicule

### Rollback si problème

```bash
# Revenir à l'image précédente (si taguée)
docker-compose down
git checkout <commit-précédent>
docker-compose up -d --build
```

---

## Structure des fichiers modifiés

```
deploy-server/
├── api/
│   ├── Dockerfile                              # MODIFIÉ — copie templates email
│   ├── package.json                            # MODIFIÉ — ajout nodemailer
│   ├── prisma/schema.prisma                    # MODIFIÉ — PasswordResetToken
│   └── src/auth/
│       ├── auth.controller.ts                  # MODIFIÉ — +forgot/reset endpoints
│       ├── auth.service.ts                     # MODIFIÉ — +forgotPassword/resetPassword
│       ├── dto/
│       │   ├── forgot-password.dto.ts          # NOUVEAU
│       │   ├── reset-password.dto.ts           # NOUVEAU
│       │   └── index.ts                        # MODIFIÉ — exports
│       └── templates/
│           └── reset-password.html             # NOUVEAU — template email HTML
├── web/src/
│   ├── App.tsx                                 # MODIFIÉ — +routes forgot/reset
│   ├── services/auth.ts                        # MODIFIÉ — +forgotPassword/resetPassword
│   └── pages/
│       ├── auth/
│       │   ├── LoginPage.tsx                   # MODIFIÉ — +lien mot de passe oublié
│       │   ├── ForgotPasswordPage.tsx          # NOUVEAU
│       │   └── ResetPasswordPage.tsx           # NOUVEAU
│       └── vehicles/
│           └── VehicleDetailPage.tsx           # MODIFIÉ — +bouton Entretiens
├── .env                                        # MODIFIÉ — +variables SMTP
└── .env.example                                # MODIFIÉ — +variables SMTP
deploy-android/src/
├── navigation/RootNavigator.tsx                # MODIFIÉ — +ForgotPassword screen
├── screens/
│   ├── LoginScreen.tsx                         # MODIFIÉ — +lien mot de passe oublié
│   ├── ForgotPasswordScreen.tsx               # NOUVEAU
│   ├── MaintenanceScreen.tsx                   # MODIFIÉ — fix bug notifications
│   ├── VehicleMaintenanceScreen.tsx            # MODIFIÉ — fix bug notifications
│   └── VehicleDetailScreen.tsx                # MODIFIÉ — +bouton Entretiens
└── services/
    ├── api.ts                                  # MODIFIÉ — +forgotPassword
    └── notifications.ts                        # MODIFIÉ — fix bug cancel
```
