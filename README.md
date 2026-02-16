# WordMaster - Language Learning App

A vocabulary learning app with spaced repetition, CEFR levels, and multi-language support built with React Native (Expo) and an Express/PostgreSQL backend.

## Quick Start

```bash
cd WordMasterApp
npm install
npx expo start --ios
```

The backend runs on AWS (see `AWS_DEPLOYMENT_GUIDE.md` for deployment details).

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
WordMasterApp/
  src/
    screens/         HomeScreen, LearningScreen, ProfileScreen, SettingsScreen, etc.
    services/        api, authService, followService, database, TTSService, etc.
    contexts/        AuthContext
    navigation/      MainTabs (bottom tab navigator)
    components/      ErrorBoundary
    utils/           distractorGenerator

backend/
  src/
    controllers/     auth, user, follow, progress, words
    models/          user, follow, progress
    routes/          auth, user, follow, progress, words
    middleware/      auth (JWT)
    config/          database (pg pool)
    scripts/         SQL migrations
```

## Development

```bash
# Frontend
cd WordMasterApp
npm install
npx expo start --ios

# Backend (local)
cd backend
npm install
cp .env.example .env   # configure DB credentials and JWT secrets
node src/server.js
```

## Deployment

The backend is deployed on AWS EC2 with an RDS PostgreSQL database behind Nginx. See `AWS_DEPLOYMENT_GUIDE.md` for the full step-by-step process. The typical update flow is:

```bash
ssh -i wordmaster-key.pem ubuntu@<EC2_IP>
cd ~/Wordmaster/backend
git pull origin main
npm install
pm2 restart wordmaster-api
```

## License

MIT
