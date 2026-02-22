# WordMaster - Current Development Status

**Last Updated:** February 23, 2025  
**Current Version:** 2.1 (Admin UI + Password Reset)  
**Previous Commit:** `3a5df8a` - Monorepo reorganization with admin backend

---

## 📋 Quick Summary

WordMaster is a language learning app with vocabulary and grammar exercises using spaced repetition. The project uses a monorepo structure with a mobile app, backend API, and admin web panel.

**Tech Stack:**
- **Mobile:** React Native + Expo (iOS/Android)
- **Backend:** Node.js + Express + PostgreSQL
- **Admin:** React Admin + Vite + MUI (built and functional)
- **Database:** PostgreSQL (AWS RDS in production)

---

## ✅ What's Working (Production Ready)

### Mobile App (`mobile/`)
- ✅ User authentication (JWT)
- ✅ Guest mode (offline learning)
- ✅ 5 languages: Spanish, French, German, Hungarian (EN ↔ target)
- ✅ CEFR levels A1-C2
- ✅ Learning modes: Multiple choice, fill-in-blank, matching pairs, typing
- ✅ Spaced repetition (SM-2 algorithm)
- ✅ Achievement system (32 badges)
- ✅ Daily streak tracking
- ✅ Social features (follow users)
- ✅ Progress export/import
- ✅ Text-to-speech
- ✅ Local SQLite database
- ✅ AWS backend integration

### Backend API (`backend/`)
- ✅ REST API (Express)
- ✅ PostgreSQL database (AWS RDS)
- ✅ JWT authentication
- ✅ User management endpoints
- ✅ Word/sentence queries by language & level
- ✅ Progress tracking
- ✅ Social features (follow/unfollow)
- ✅ **NEW:** Admin API routes (`/api/admin/*`)
- ✅ **NEW:** Role-based access control
- ✅ Deployed on AWS EC2 with PM2

---

## 🆕 What Was Added This Session

### Admin System - ✅ COMPLETE (Backend + Frontend)

**Backend (`backend/src/`) - ✅ COMPLETE**
- ✅ Admin routes: `/api/admin/*`
- ✅ Admin controller: `controllers/admin.controller.js`
- ✅ Admin middleware: `middleware/isAdmin.middleware.js`
- ✅ Database migration: `scripts/add_user_roles.sql` (run on AWS RDS)
- ✅ Password reset: `POST /api/auth/request-reset` and `POST /api/auth/reset-password`
- ✅ Admin users promoted in production database

**Admin Frontend (`admin/`) - ✅ COMPLETE**
- ✅ React Admin + Vite + MUI application
- ✅ Custom data provider (adapts backend API format to react-admin)
- ✅ Custom auth provider (JWT login via `/api/auth/login`)
- ✅ Custom login page with password reset flow
- ✅ Dashboard with platform stats, word counts, DB health
- ✅ User management (list with search/filters, show, edit roles)
- ✅ Language pairs list with word counts and CEFR levels
- ✅ Bulk word import page (JSON file upload or paste)
- ✅ Vite dev proxy to AWS backend (`3.91.69.195`)
- ✅ Production build configured with `/admin/` base path

**Admin API Endpoints:**
```
Authentication:
  POST   /api/auth/request-reset       # Request password reset token
  POST   /api/auth/reset-password      # Reset password with token

User Management:
  GET    /api/admin/users              # List all users
  GET    /api/admin/users/:id          # User details
  PUT    /api/admin/users/:id          # Update user
  DELETE /api/admin/users/:id          # Delete user
  GET    /api/admin/users/:id/progress # User progress

Language & Vocabulary:
  GET    /api/admin/languages          # Language pairs + stats
  POST   /api/admin/languages          # Add language pair
  GET    /api/admin/words/stats        # Word statistics
  POST   /api/admin/words/import       # Bulk import (JSON)
  PUT    /api/admin/words/:id          # Update word
  DELETE /api/admin/words/:id          # Delete word

Sentence Templates:
  GET    /api/admin/sentences          # List sentences
  POST   /api/admin/sentences          # Add sentence
  PUT    /api/admin/sentences/:id      # Update sentence
  DELETE /api/admin/sentences/:id      # Delete sentence

Platform Stats:
  GET    /api/admin/stats              # Overall statistics
  GET    /api/admin/stats/users        # User growth
  GET    /api/admin/stats/learning     # Learning analytics
  GET    /api/admin/database/health    # DB health check
```

---

## 📁 Current Project Structure

```
Wordmaster/
├── mobile/               React Native app (was WordMasterApp)
│   ├── src/
│   │   ├── screens/      All app screens
│   │   ├── services/     API clients, database, TTS
│   │   ├── contexts/     Auth context
│   │   └── navigation/   Tab navigation
│   └── package.json
│
├── backend/              Express API + PostgreSQL
│   ├── src/
│   │   ├── controllers/  auth, user, admin, words, etc.
│   │   ├── models/       Database models
│   │   ├── routes/       API routes
│   │   ├── middleware/   auth, isAdmin
│   │   ├── config/       database, schema.sql
│   │   └── scripts/      migrations, import scripts
│   └── package.json
│
├── admin/                Admin web panel (React Admin + Vite)
│   ├── src/
│   │   ├── components/   Dashboard, WordImport, LoginPage
│   │   ├── resources/    users, languages (react-admin views)
│   │   ├── layout/       AdminLayout (sidebar navigation)
│   │   ├── App.jsx       Main app wiring
│   │   ├── authProvider.js   JWT auth for react-admin
│   │   └── dataProvider.js   Custom API adapter
│   ├── .env              Dev config (Vite proxy to AWS)
│   ├── .env.production   Production config (direct AWS URLs)
│   ├── vite.config.js    Vite + proxy + base path
│   └── package.json
│
├── data/                 Word frequency lists
│   ├── spanish/
│   ├── french/
│   ├── german/
│   └── hungarian/
│
├── shared/               Common code
│   └── constants/
│       └── cefr-levels.js
│
├── docs/                 All documentation
│   ├── ADMIN_SETUP.md
│   ├── ADMIN_DEPLOYMENT.md
│   ├── AWS_DEPLOYMENT_GUIDE.md
│   └── INDEX.md
│
└── package.json          Root workspace config
```

---

## ✅ Completed This Session

- [x] Database migration run on AWS RDS (role column added)
- [x] Admin users promoted (`robi_az@yahoo.com`, `szekelyrobi@gmail.com`)
- [x] Admin web UI built with React Admin (dashboard, users, languages, word import)
- [x] Password reset endpoints added (`/api/auth/request-reset`, `/api/auth/reset-password`)
- [x] Custom login page with password reset flow
- [x] Backend deployed to AWS EC2 with new admin routes + password reset
- [x] Fixed `csv-parser` crash on EC2 (unused import removed)
- [x] EC2 security group updated for SSH access

## 🎯 Next Steps (Priority Order)

### 1. Deploy Admin UI to EC2 (15 min)

Follow `docs/ADMIN_DEPLOYMENT.md` to serve the built admin panel via nginx on `https://3.91.69.195/admin`.

### 2. Import More Language Data

Use the admin panel's "Import Words" page or the CLI scripts:

```bash
cd backend
node src/scripts/categorizeWords.js
```

### 3. Add Rate Limiting to Admin Endpoints

The admin API has no rate limiting. Add `express-rate-limit` for production security.

### 4. Add Audit Logging

Admin actions (user edits, deletions, word imports) should be logged for accountability.

### 5. Set Up Email Service for Password Reset

Password reset currently returns the token in the API response. Connect an email service (SES, SendGrid) to deliver tokens via email instead.

---

## 🚀 How to Start Development

### First Time Setup

```bash
# Clone or pull latest
git pull origin main

# Install all dependencies
npm run install:all
# OR manually:
cd backend && npm install
cd ../mobile && npm install
cd ../admin && npm install
```

### Daily Development

The backend runs on AWS EC2 (`3.91.69.195`), not locally.

```bash
# Terminal 1 - Admin Panel (Vite proxies API calls to AWS)
cd admin
npm run dev
# Opens on http://localhost:5173

# Terminal 2 - Mobile App
cd mobile
npx expo start --ios
# Or use: ./START_APP.sh
```

---

## 📊 Database Schema Overview

**Main Tables:**
- `users` - User accounts (**NEW: role column**)
- `user_settings` - User preferences
- `user_word_progress` - Learning progress
- `words` - Vocabulary database (all languages)
- `sentence_templates` - Grammar exercises
- `learning_sessions` - Study sessions
- `refresh_tokens` - Auth tokens

**See:** `backend/src/config/schema.sql` for full schema

---

## 🔑 Important Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
PORT=3000
```

**Admin (`admin/.env`):**
```env
VITE_API_URL=http://localhost:3000/api/admin
```

---

## 🐛 Known Issues / Tech Debt

1. **No rate limiting on admin endpoints** - Should add `express-rate-limit` for production
2. **No audit logging** - Admin actions should be logged for accountability
3. **Password reset returns token in response** - Should send via email (needs SES/SendGrid)
4. **Admin UI not yet deployed to EC2** - Built locally, needs nginx setup (see `docs/ADMIN_DEPLOYMENT.md`)
5. **Import scripts need testing** - Word import via admin panel untested with large datasets

---

## 📚 Key Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `CURRENT_STATUS.md` | **THIS FILE** - Development status |
| `QUICK_START.md` | Quick start for new sessions |
| `docs/ADMIN_SETUP.md` | Admin system setup guide |
| `docs/ADMIN_DEPLOYMENT.md` | Deploying admin UI to AWS EC2 |
| `docs/AWS_DEPLOYMENT_GUIDE.md` | AWS infrastructure setup |
| `docs/INDEX.md` | Documentation index |
| `backend/README.md` | Backend API documentation |
| `admin/README.md` | Admin panel documentation |

---

## 🔄 Git Workflow

```bash
# Before starting work
git pull origin main

# After making changes
git add .
git commit -m "Description of changes"
git push origin main

# Current branch: main
# Latest commit: 4f67799
```

---

## 🎓 Learning Resources

**For Admin Panel Development:**
- React Admin Docs: https://marmelab.com/react-admin/
- AdminJS Docs: https://docs.adminjs.co/
- Express + PostgreSQL: https://node-postgres.com/

**Current Implementation:**
- SM-2 Algorithm: Used for spaced repetition
- JWT Auth: Access & refresh tokens
- CEFR Levels: A1 (beginner) to C2 (proficient)

---

## 💡 Design Decisions Made

1. **Monorepo Structure** - Keep related apps together, share code easily
2. **Role-Based Access** - Admin, moderator, user roles for security
3. **API-First** - Backend serves mobile, web, and admin
4. **Offline-First Mobile** - SQLite for local storage, sync optional
5. **React Admin** - Chosen and built for admin UI with custom data/auth providers
6. **PostgreSQL** - Chosen over MongoDB for data integrity
7. **JWT Tokens** - Stateless authentication

---

## 🚨 Before You Start

### ✅ Checklist for Next Session

- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `cd admin && npm install`
- [ ] Review this document
- [ ] Start admin panel: `cd admin && npm run dev`
- [ ] Open `http://localhost:5173` and log in

### 🎯 Immediate Tasks

**Should Do:**
1. Deploy admin UI to EC2 (see `docs/ADMIN_DEPLOYMENT.md`)
2. Import more language data via admin panel
3. Add rate limiting to admin endpoints

**Nice to Have:**
4. Add audit logging for admin actions
5. Set up email service for password reset
6. Test word import with large datasets

---

## 📞 Getting Help

**Documentation:**
- Check `docs/` folder first
- Review API endpoints in controller files
- Check database schema in `backend/src/config/schema.sql`

**Testing:**
- Use Postman or curl for API testing
- Check browser console for frontend errors
- Check terminal logs for backend errors

**Common Issues:**
- **"Cannot find module"** → Run `npm install` in that folder
- **"Port already in use"** → Kill process on that port
- **"Database connection failed"** → Check `.env` file
- **"Unauthorized" from admin API** → Check JWT token and user role

---

## 🎯 Vision & Roadmap

**Current State:** Mobile app + Backend API + Admin panel all functional. Backend and DB on AWS.

**Next Milestone:** Admin UI deployed to EC2, language data imported, production hardening.

**Future Plans:**
- Web app for desktop users (same backend)
- More languages (Portuguese, Italian, Japanese, etc.)
- Advanced analytics dashboard
- Team/classroom features
- Premium features
- Gamification enhancements

---

## 📈 Metrics to Track

Available via admin dashboard at `http://localhost:5173`:
- Total users and active users (30-day)
- Words in database by language pair and CEFR level
- Learning sessions and average accuracy
- Database health and table sizes

---

**Start here:** `cd admin && npm run dev`, then open `http://localhost:5173`.

---

_Last Updated: February 23, 2025_
