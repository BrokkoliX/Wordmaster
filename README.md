# WordMaster - Language Learning App

A vocabulary learning app with spaced repetition, CEFR levels, and multi-language support built with React Native (Expo) and an Express/PostgreSQL backend.

## Quick Start

The production backend runs on AWS at `word-master.org` and does not need to be started locally. The admin panel's Vite dev server proxies API calls to the production backend.

```bash
# Install all dependencies
npm run install:all

# Terminal 1 — Mobile app
cd mobile
npx expo start --ios

# Terminal 2 — Admin panel (optional)
cd admin
npm run dev
# Opens on http://localhost:5173
```

To run the backend locally instead of against production, copy the example env and start the server:

```bash
cd backend
cp .env.example .env   # configure DB credentials and JWT secrets
npm install
node src/server.js
```

## Tech Stack

**Mobile:** React Native (Expo), React Navigation, SQLite (local), AsyncStorage

**Backend:** Node.js, Express, PostgreSQL (AWS RDS), JWT authentication

**Admin:** React Admin, Vite, MUI

**Infrastructure:** AWS EC2, RDS PostgreSQL, Nginx reverse proxy, PM2

## Features

WordMaster supports seven languages (English, Spanish, French, German, Hungarian, Portuguese, Russian) with CEFR levels A1 through C2. The learning system uses SM-2 spaced repetition with four exercise modes: multiple choice, fill-in-the-blank, matching pairs, and typing. Voice pronunciation is available via the device TTS engine.

Users authenticate through the backend API or continue as a guest with offline learning. Authenticated users can follow other learners and manage follow requests through the profile screen. Progress is tracked locally with SQLite and synced to the backend via delta sync. Progress can also be exported/imported as backups.

The achievement system awards 32 badges across 7 categories. Daily streak tracking provides motivation with milestone celebrations at 7, 30, and 100 days. Daily challenges, weak-area detection, and a mistake journal offer targeted practice.

The admin panel provides a dashboard with platform stats, user management with search and role editing, language pair management, and bulk word import.

## Project Structure

```
Wordmaster/
├── backend/              Express API server
│   ├── src/
│   │   ├── controllers/  auth, user, admin, follow, progress, words,
│   │   │                 leaderboard, subscription, sentences
│   │   ├── models/       user, follow, progress, subscription, xp
│   │   ├── routes/       all API route definitions
│   │   ├── middleware/   auth (JWT), isAdmin, checkFeature
│   │   ├── config/       database pool, schema.sql, featureKeys
│   │   ├── scripts/      SQL migrations and data-import utilities
│   │   └── services/     business logic helpers
│   └── package.json
│
├── mobile/               React Native app
│   ├── src/
│   │   ├── screens/      all app screens
│   │   ├── services/     api, database, auth, TTS, achievements,
│   │   │                 xp, leaderboard, analytics, streaks, etc.
│   │   ├── constants/    CEFR levels, languages, SQL filters
│   │   ├── contexts/     AuthContext
│   │   ├── navigation/   MainTabs (bottom tab navigator)
│   │   ├── components/   ErrorBoundary
│   │   └── utils/        distractorGenerator
│   └── package.json
│
├── admin/                Admin web panel (React Admin + Vite + MUI)
│   ├── src/
│   │   ├── components/   Dashboard, WordImport, LoginPage
│   │   ├── resources/    users, languages (react-admin views)
│   │   ├── layout/       AdminLayout (sidebar navigation)
│   │   ├── App.jsx       main app wiring
│   │   ├── authProvider.js   JWT auth for react-admin
│   │   └── dataProvider.js   custom API adapter
│   └── package.json
│
├── shared/               Constants shared across apps
│   └── constants/        CEFR levels, language definitions
│
├── data/                 Frequency word lists
├── docs/                 Deployment, scaling, and feature docs
├── scripts/              Shell scripts for deploy and server setup
└── package.json          Root workspace config
```

## Documentation

| File | Purpose |
|------|---------|
| `docs/ADMIN_SETUP.md` | Admin system setup and configuration |
| `docs/ADMIN_DEPLOYMENT.md` | Deploying admin UI to EC2 via Nginx |
| `docs/AWS_DEPLOYMENT_GUIDE.md` | Full AWS infrastructure setup |
| `docs/DEPLOYMENT_RUNBOOK.md` | Day-to-day deploy, rollback, and operations |
| `docs/DOMAIN_SETUP.md` | Route 53 DNS and SSL certificate setup |
| `docs/SCALING.md` | Architecture assessment and scaling roadmap |
| `docs/VOCABULARY.md` | Vocabulary sources, filtering, and import |
| `docs/ADDING_LANGUAGES.md` | Step-by-step guide for new languages |
| `docs/AVAILABLE_LANGUAGE_PAIRS.md` | FreeDict.org language pair inventory |
| `docs/LANGUAGE_DATA_STRATEGY.md` | Data sourcing and cross-language pair strategy |
| `docs/PORTUGUESE_RUSSIAN_SETUP.md` | Portuguese and Russian addition log |
| `docs/FEATURE_IMPLEMENTATION_PLAN.md` | Six planned mobile features with specs |
| `docs/XP_LEADERBOARD_PLAN.md` | XP system and leaderboard design |
| `docs/SUBSCRIPTION_TIERS_PLAN.md` | Free / Plus / Super tier system design |
| `backend/README.md` | Backend API documentation |
| `admin/README.md` | Admin panel documentation |

## Known Issues and Tech Debt

**Refresh token validation.** `POST /auth/refresh-token` verifies the JWT signature but does not check the `refresh_tokens` table. Logout deletes from that table, but the deletion has no effect because the refresh endpoint never looks it up. Tokens remain valid until they expire naturally.

**Admin SQL query endpoint.** `POST /api/admin/database/query` allows arbitrary SELECT statements. The regex-based blocking is bypassable. This endpoint should be removed or gated behind VPN/IP allowlist in production.

**No rate limiting on admin endpoints.** Add `express-rate-limit` for production security.

**Password reset returns token in API response.** Should send the token via email (SES or SendGrid) instead.

**No backend tests.** `backend/tests/` is empty. The mobile app has only 2 test files.

**Large vocabulary files in git.** `mobile/src/data/enhanced/` (46 MB) is tracked in git. Consider Git LFS or build-time download from S3.

## Deployment

The backend is deployed on AWS EC2 with an RDS PostgreSQL database behind Nginx. See `docs/AWS_DEPLOYMENT_GUIDE.md` for initial setup and `docs/DEPLOYMENT_RUNBOOK.md` for the day-to-day process. The typical update flow is:

```bash
ssh -i wordmaster-key.pem ubuntu@<EC2_IP>
cd ~/Wordmaster/backend
git pull origin main
npm install
pm2 restart wordmaster-api
```

## License

MIT
