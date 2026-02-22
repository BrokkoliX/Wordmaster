# WordMaster - Current Development Status

**Last Updated:** February 22, 2024  
**Current Version:** 2.0 (Post-Reorganization)  
**Git Commit:** `4f67799` - Reorganize project into monorepo structure with admin system

---

## 📋 Quick Summary

WordMaster is a language learning app with vocabulary and grammar exercises using spaced repetition. The project was just reorganized from a scattered structure into a professional monorepo with a new admin system for managing users, languages, and content.

**Tech Stack:**
- **Mobile:** React Native + Expo (iOS/Android)
- **Backend:** Node.js + Express + PostgreSQL
- **Admin:** React Admin (ready to build)
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

## 🆕 What Was Just Added (Not Yet Built)

### Admin System (Backend Complete, Frontend Pending)

**Backend (`backend/src/`) - ✅ COMPLETE**
- ✅ Admin routes: `/api/admin/*`
- ✅ Admin controller: `controllers/admin.controller.js`
- ✅ Admin middleware: `middleware/isAdmin.middleware.js`
- ✅ Database migration: `scripts/add_user_roles.sql`

**Admin API Endpoints Available:**
```
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

**Admin Frontend (`admin/`) - ⏳ NOT YET BUILT**
- ⏳ Structure ready (package.json configured)
- ⏳ React Admin dependencies specified
- ⏳ README with setup instructions
- ⏳ Needs UI implementation

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
├── admin/                Admin web panel (READY TO BUILD)
│   ├── package.json      React Admin configured
│   └── README.md         Setup instructions
│
├── data/                 Word frequency lists (was FrequencyWords)
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
│   ├── AWS_DEPLOYMENT_GUIDE.md
│   └── REORGANIZATION.md
│
└── package.json          Root workspace config
```

---

## 🎯 Next Steps (Priority Order)

### 1. Set Up Admin System Database (15 minutes)

**Run the migration to add user roles:**

```bash
# Connect to your PostgreSQL database
psql -U postgres -d wordmaster_db -f backend/src/scripts/add_user_roles.sql

# Or manually:
psql -U postgres -d wordmaster_db

# Then run:
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
UPDATE users SET role = 'user' WHERE role IS NULL;

# Make yourself an admin (replace with your email):
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Verify it worked:**
```sql
SELECT id, email, username, role FROM users LIMIT 5;
```

### 2. Test Admin API Endpoints (15 minutes)

```bash
# Start backend
cd backend
node src/server.js

# In another terminal, test with curl:

# 1. Login as admin to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin-email@example.com","password":"yourpassword"}'

# Save the token, then test admin endpoints:

# 2. Get all users
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Get platform stats
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Get word statistics
curl http://localhost:3000/api/admin/words/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Choose and Build Admin Interface (2-4 hours)

**Option A: AdminJS (Quickest - 30 minutes)**
```bash
cd backend
npm install adminjs @adminjs/express @adminjs/sql @adminjs/postgresql

# Then add to backend/src/server.js (see docs/ADMIN_SETUP.md)
```

**Option B: React Admin (Recommended - 2-4 hours)**
```bash
cd admin
npm install

# Build out the admin UI using React Admin
# - Create data provider
# - Create auth provider
# - Add resource components
# - Customize as needed
```

**Option C: Custom Dashboard (Most work - days)**
Build your own from scratch using the API endpoints.

**Recommendation:** Start with **AdminJS** to get something working quickly, then migrate to **React Admin** later for more customization.

### 4. Import More Language Data (Optional)

You have word frequency lists in `data/` folder ready to import:
```bash
cd backend
node src/scripts/categorizeWords.js  # Categorize words
# Then use admin panel to bulk import
```

### 5. Deploy Admin Panel (After building)

```bash
# Build admin panel
cd admin
npm run build

# Deploy options:
# - Netlify (easiest)
# - Vercel
# - AWS S3 + CloudFront
# - Serve from Express (add static middleware)
```

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

```bash
# Terminal 1 - Backend
cd backend
node src/server.js
# Runs on http://localhost:3000

# Terminal 2 - Mobile App
cd mobile
npx expo start --ios
# Or use: ./START_APP.sh

# Terminal 3 - Admin Panel (when ready)
cd admin
npm run dev
# Runs on http://localhost:5173
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

1. **Admin UI not built yet** - Backend ready, frontend pending
2. **User roles not in production DB yet** - Need to run migration on AWS
3. **No admin user yet** - Need to promote first admin
4. **Import scripts need testing** - Word import via admin API untested
5. **No rate limiting on admin endpoints** - Should add for production
6. **No audit logging** - Admin actions should be logged

---

## 📚 Key Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `CURRENT_STATUS.md` | **THIS FILE** - Development status |
| `REORGANIZATION_SUMMARY.md` | Reorganization guide |
| `PROJECT_STRUCTURE.md` | Visual structure diagrams |
| `docs/ADMIN_SETUP.md` | Admin system setup guide |
| `docs/AWS_DEPLOYMENT_GUIDE.md` | AWS deployment instructions |
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
5. **React Admin** - Chosen for admin UI (not built yet)
6. **PostgreSQL** - Chosen over MongoDB for data integrity
7. **JWT Tokens** - Stateless authentication

---

## 🚨 Before You Start

### ✅ Checklist for Next Session

- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm run install:all`
- [ ] Review this document
- [ ] Check `docs/ADMIN_SETUP.md` for admin setup
- [ ] Verify backend runs: `cd backend && node src/server.js`
- [ ] Verify mobile runs: `cd mobile && npx expo start`
- [ ] Run database migration if not done yet
- [ ] Choose admin interface approach (AdminJS vs React Admin)

### 🎯 Immediate Tasks

**Must Do:**
1. Run database migration to add role column
2. Promote yourself to admin in database
3. Test admin API endpoints

**Should Do:**
4. Choose admin interface (AdminJS recommended to start)
5. Build basic admin UI

**Nice to Have:**
6. Add rate limiting to admin endpoints
7. Add audit logging for admin actions
8. Test word import functionality

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

**Current State:** Mobile app + Backend API working, Admin system backend ready

**Next Milestone:** Admin panel built and deployed

**Future Plans:**
- Web app for desktop users (same backend)
- More languages (Portuguese, Italian, Japanese, etc.)
- Advanced analytics dashboard
- Team/classroom features
- Premium features
- Gamification enhancements

---

## 📈 Metrics to Track

Once admin is built, monitor:
- Total users
- Active users (daily/weekly/monthly)
- Words learned
- Learning sessions
- Average accuracy
- Popular languages
- User retention
- Daily streaks

---

**Good luck with your next development session! 🚀**

**Start here:** Run the database migration, test the admin API, then choose your admin interface approach.

---

_This document is your context for the next session. Update it as the project evolves._
