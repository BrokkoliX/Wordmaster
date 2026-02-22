# WordMaster Project Structure

## 📁 Directory Tree

```
Wordmaster/
│
├── 📱 mobile/                    React Native Mobile App
│   ├── assets/                  Images, fonts, icons
│   ├── ios/                     iOS specific files
│   ├── src/                     Application source code
│   │   ├── screens/             UI screens
│   │   ├── services/            API clients, database
│   │   ├── contexts/            React contexts
│   │   ├── navigation/          Navigation setup
│   │   ├── components/          Reusable components
│   │   └── utils/               Utility functions
│   ├── scripts/                 Build and maintenance scripts
│   ├── package.json
│   └── app.json                 Expo configuration
│
├── 🖥️  backend/                  Express API Server
│   ├── src/
│   │   ├── controllers/         Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── admin.controller.js      ⭐ NEW
│   │   │   ├── words.controller.js
│   │   │   └── ...
│   │   ├── models/              Database models
│   │   ├── routes/              API routes
│   │   │   ├── admin.routes.js          ⭐ NEW
│   │   │   └── ...
│   │   ├── middleware/          Authentication, validation
│   │   │   ├── auth.middleware.js
│   │   │   └── isAdmin.middleware.js    ⭐ NEW
│   │   ├── config/              Configuration files
│   │   │   ├── database.js
│   │   │   └── schema.sql
│   │   ├── scripts/             Database migrations
│   │   │   └── add_user_roles.sql       ⭐ NEW
│   │   ├── services/            Business logic
│   │   ├── utils/               Helper functions
│   │   └── server.js            Main entry point
│   ├── tests/                   Test files
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── 🎛️  admin/                    Admin Web Panel
│   ├── src/                     Admin UI source (to build)
│   ├── public/                  Static assets
│   ├── package.json             React Admin configured
│   ├── .gitignore
│   └── README.md                Setup instructions
│
├── 📊 data/                      Word Frequency Lists
│   ├── spanish/                 Spanish word lists
│   ├── french/                  French word lists
│   ├── german/                  German word lists
│   ├── hungarian/               Hungarian word lists
│   └── content/                 Other data files
│
├── 🔧 shared/                    Common Code
│   ├── constants/               Shared constants
│   │   └── cefr-levels.js       CEFR level utilities
│   ├── types/                   TypeScript types (future)
│   ├── utils/                   Shared utilities (future)
│   └── README.md
│
├── 📚 docs/                      Documentation
│   ├── ADMIN_SETUP.md           Admin system setup guide
│   ├── AWS_DEPLOYMENT_GUIDE.md  AWS deployment instructions
│   ├── AWS_VOCABULARY_SETUP.md  Vocabulary import on AWS
│   ├── REORGANIZATION.md        Reorganization details
│   ├── VOCABULARY_QUICK_START.md Quick vocabulary guide
│   └── ...
│
├── 📄 Root Files
│   ├── package.json             Root workspace configuration
│   ├── README.md                Main project README
│   ├── REORGANIZATION_SUMMARY.md Complete reorganization summary
│   ├── PROJECT_STRUCTURE.md     This file
│   ├── START_APP.sh             Quick start script
│   ├── .gitignore               Git ignore rules
│   └── wordmaster-key.pem       AWS SSH key
│
└── 🔒 Hidden Folders
    ├── .git/                    Git repository
    └── .tabnine/                Tabnine AI cache
```

---

## 🎯 Folder Purposes

### 📱 mobile/
**Purpose**: React Native mobile application for iOS/Android  
**Technology**: React Native, Expo, SQLite  
**Users**: End users learning languages  

### 🖥️ backend/
**Purpose**: RESTful API server and database  
**Technology**: Node.js, Express, PostgreSQL  
**Serves**: Mobile app, admin panel, future web app  

### 🎛️ admin/
**Purpose**: Web-based admin panel for content management  
**Technology**: React Admin or AdminJS  
**Users**: Administrators managing platform  

### 📊 data/
**Purpose**: Source data for vocabulary (frequency word lists)  
**Format**: JSON, CSV, TXT files  
**Usage**: Import scripts read from here  

### 🔧 shared/
**Purpose**: Code shared across multiple applications  
**Contains**: Constants, types, utilities  
**Benefits**: DRY principle, consistency  

### 📚 docs/
**Purpose**: All project documentation  
**Contains**: Setup guides, deployment docs, notes  
**Audience**: Developers, maintainers  

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                     data/ (Source)                      │
│                 Word Frequency Lists                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Import Scripts
                         ↓
┌─────────────────────────────────────────────────────────┐
│              backend/ (PostgreSQL DB)                   │
│              Words, Users, Progress                     │
└─────┬──────────────────┬──────────────────┬─────────────┘
      │                  │                  │
      │ API              │ API              │ API
      ↓                  ↓                  ↓
┌──────────┐      ┌──────────┐      ┌──────────┐
│ mobile/  │      │  admin/  │      │   web/   │
│   App    │      │  Panel   │      │  (future)│
└──────────┘      └──────────┘      └──────────┘
```

---

## 🌐 API Endpoints Structure

```
/api/
├── /auth/              Authentication (login, register)
├── /users/             User management (profile, settings)
├── /words/             Word queries (by language, level)
├── /sentences/         Sentence templates
├── /progress/          Learning progress tracking
├── /follow/            Social features (following users)
└── /admin/             Admin-only endpoints ⭐ NEW
    ├── /users          User management (all users)
    ├── /languages      Language pair management
    ├── /words          Word CRUD operations
    ├── /sentences      Sentence CRUD operations
    └── /stats          Platform analytics
```

---

## 🗄️ Database Schema

```
PostgreSQL Database
├── users                    User accounts
├── user_settings            User preferences
├── user_word_progress       Learning progress per word
├── learning_sessions        Study session records
├── words                    Vocabulary database ⭐
├── sentence_templates       Grammar exercises
├── refresh_tokens           Authentication tokens
├── password_reset_tokens    Password recovery
└── ... (see backend/src/config/schema.sql)
```

---

## 🎨 Technology Stack by Component

### Mobile App
```
React Native + Expo
├── Navigation: React Navigation
├── State: React Context + Hooks
├── Storage: SQLite (offline), AsyncStorage
├── API: Axios / Fetch
└── Voice: Expo Speech
```

### Backend
```
Node.js + Express
├── Database: PostgreSQL (pg pool)
├── Auth: JWT + bcrypt
├── Security: Helmet, CORS
├── Logging: Morgan
└── Process: PM2 (production)
```

### Admin Panel (Options)
```
Option 1: React Admin
├── Framework: React Admin
├── Data: ra-data-simple-rest
├── Build: Vite
└── Deploy: Netlify / Vercel

Option 2: AdminJS
├── Auto-generated from database
├── Built into Express backend
└── Minimal configuration
```

---

## 📦 Dependencies Overview

### Root
- Workspace management (npm workspaces)

### mobile/
- react-native, expo
- react-navigation
- expo-sqlite
- axios

### backend/
- express
- pg (PostgreSQL)
- bcrypt, jsonwebtoken
- helmet, cors, morgan

### admin/
- react, react-dom
- react-admin (or adminjs)
- vite (build tool)

### shared/
- No dependencies (pure JS/TS)

---

## 🚀 Quick Commands Reference

```bash
# Mobile Development
cd mobile && npx expo start --ios

# Backend Development  
cd backend && node src/server.js

# Admin Development
cd admin && npm run dev

# Workspace (from root)
npm run dev:mobile
npm run dev:backend
npm run dev:admin
npm run install:all
```

---

## 📈 Growth Path

```
Current:
├── ✅ Mobile app (production)
├── ✅ Backend API (production)
├── ⏳ Admin panel (ready to build)
└── ✅ Data import scripts

Future:
├── Web app (same backend API)
├── Advanced analytics
├── Team features
├── Gamification
└── Premium features
```

---

## 🔐 Access Control

| Component | Who Can Access | Authentication |
|-----------|---------------|----------------|
| **mobile/** | All users | JWT (optional for guests) |
| **backend/** `/api/*` | All users | JWT for protected routes |
| **backend/** `/api/admin/*` | Admins only | JWT + admin role check |
| **admin/** | Admins only | JWT token login |
| **data/** | Developers only | File system access |

---

**Last Updated**: February 2024  
**Version**: 2.0 (Post-Reorganization)
