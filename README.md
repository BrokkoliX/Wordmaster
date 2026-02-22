# WordMaster - Language Learning App

A vocabulary learning app with spaced repetition, CEFR levels, and multi-language support built with React Native (Expo) and an Express/PostgreSQL backend.

## Quick Start

```bash
# Mobile app
cd mobile
npm install
npx expo start --ios

# Backend (local development)
cd backend
npm install
cp .env.example .env
node src/server.js

# Admin panel (optional)
cd admin
npm install
npm run dev
```

The production backend runs on AWS (see `docs/AWS_DEPLOYMENT_GUIDE.md` for deployment details).

## Tech Stack

**Frontend:** React Native (Expo), React Navigation, SQLite (local), AsyncStorage

**Backend:** Node.js, Express, PostgreSQL (AWS RDS), JWT authentication

**Infrastructure:** AWS EC2, RDS PostgreSQL, Nginx reverse proxy, PM2

## Features

WordMaster supports five languages (English, Spanish, French, German, Hungarian) with CEFR levels A1 through C2. The learning system uses SM-2 spaced repetition with multiple-choice questions and smart distractor generation. Voice pronunciation is available via the device TTS engine.

Users authenticate through the backend API or continue as a guest. Authenticated users can follow other learners and manage follow requests through the profile screen. Progress is tracked locally with SQLite and can be exported/imported as backups.

The achievement system awards 32 badges across 7 categories. Daily streak tracking provides motivation with milestone celebrations at 7, 30, and 100 days.

## Project Structure

```
Wordmaster/
├── backend/              Express API server (PostgreSQL)
│   ├── src/
│   │   ├── controllers/  auth, user, admin, follow, progress, words
│   │   ├── models/       user, follow, progress
│   │   ├── routes/       auth, user, admin, follow, progress, words
│   │   ├── middleware/   auth (JWT), isAdmin
│   │   ├── config/       database (pg pool)
│   │   └── scripts/      SQL migrations
│   └── package.json
│
├── mobile/               React Native app (formerly WordMasterApp)
│   ├── src/
│   │   ├── screens/      HomeScreen, LearningScreen, ProfileScreen, etc.
│   │   ├── services/     api, authService, database, TTSService, etc.
│   │   ├── contexts/     AuthContext
│   │   ├── navigation/   MainTabs (bottom tab navigator)
│   │   ├── components/   ErrorBoundary
│   │   └── utils/        distractorGenerator
│   └── package.json
│
├── admin/                Admin web panel (NEW)
│   ├── src/              React Admin or AdminJS setup
│   ├── package.json
│   └── README.md
│
├── data/                 Frequency word lists (formerly FrequencyWords)
│   ├── spanish/
│   ├── french/
│   ├── german/
│   └── hungarian/
│
├── shared/               Common code used across apps
│   ├── constants/        CEFR levels, language codes, etc.
│   ├── types/            TypeScript definitions
│   └── utils/            Shared utilities
│
├── docs/                 All documentation
│   ├── ADMIN_SETUP.md
│   ├── AWS_DEPLOYMENT_GUIDE.md
│   ├── AWS_VOCABULARY_SETUP.md
│   └── VOCABULARY_QUICK_START.md
│
└── README.md             This file
```

## Development

```bash
# Mobile app
cd mobile
npm install
npx expo start --ios

# Backend API
cd backend
npm install
cp .env.example .env   # configure DB credentials and JWT secrets
node src/server.js

# Admin panel
cd admin
npm install
npm run dev
```

See individual README files in each folder for more details.

## Deployment

The backend is deployed on AWS EC2 with an RDS PostgreSQL database behind Nginx. See `docs/AWS_DEPLOYMENT_GUIDE.md` for the full step-by-step process. The typical update flow is:

```bash
ssh -i wordmaster-key.pem ubuntu@<EC2_IP>
cd ~/Wordmaster/backend
git pull origin main
npm install
pm2 restart wordmaster-api
```

## License

MIT
