# WordMaster Technology Stack

## ✅ YES - Fully Cross-Platform!

**WordMaster works on both iOS and Android** using the same codebase.

---

## 📱 Frontend - Mobile Application

### Core Framework
**React Native 0.81.5 + Expo ~54.0**

#### What is React Native?
- Framework for building native mobile apps using JavaScript and React
- Write once, run on **iOS** and **Android**
- Uses native components (not webviews)
- Created and maintained by Meta (Facebook)

#### What is Expo?
- Development platform built on React Native
- Simplifies development with pre-built modules
- Provides tools for building, deploying, and updating apps
- Includes testing on real devices via **Expo Go** app

### Cross-Platform Support

✅ **iOS**:
- iOS 13.4 or higher
- iPhone and iPad
- Native iOS components
- App Store ready

✅ **Android**:
- Android 6.0 (API 23) or higher
- All Android devices (phones, tablets)
- Native Android components
- Google Play Store ready

✅ **Web** (Bonus):
- Can also run on web browsers
- Progressive Web App (PWA) capable
- Same React codebase

---

## 🎨 UI/UX Technologies

### Navigation
- **@react-navigation/native** (v7.1) - Navigation framework
- **@react-navigation/bottom-tabs** (v7.13) - Bottom tab navigation
- **@react-navigation/native-stack** (v7.12) - Stack navigation

### State Management
- **React Hooks** (useState, useEffect, useContext)
- **AsyncStorage** - Local key-value storage

### UI Components
- **React Native core components** (View, Text, ScrollView, etc.)
- **SafeAreaView** - Safe area handling for notches/status bars
- **TouchableOpacity** - Touch interactions
- **ActivityIndicator** - Loading states

### Icons & Visual
- **react-native-vector-icons** - Icon library
- **Emoji** - Unicode emoji support

---

## 🗄️ Database - Mobile (Local)

### Primary Database
**expo-sqlite** (v16.0.10) - SQLite

#### Features:
- Embedded database (runs locally on device)
- SQL database engine
- Zero-configuration
- Offline-first architecture
- Fast queries with indexes
- Relational data support

#### Tables:
- `words` - Vocabulary words
- `user_word_progress` - Learning progress
- `learning_sessions` - Session history
- `user_achievements` - Unlocked achievements
- `settings` - User preferences

### Storage
- **@react-native-async-storage** (v2.2) - Key-value storage
- Used for: settings, user preferences, auth tokens

---

## 🖥️ Backend - Server API

### Runtime & Framework
**Node.js 18+ with Express.js 5.2**

#### Why Node.js?
- JavaScript on server (same language as frontend)
- Fast, event-driven architecture
- Large ecosystem (npm)
- Excellent for APIs
- Easy to scale

#### Why Express?
- Most popular Node.js web framework
- Simple, unopinionated
- Middleware support
- Large community
- Production-proven

### Database - Backend (Cloud)
**PostgreSQL 14+**

#### Why PostgreSQL?
- Open-source, enterprise-grade
- ACID compliant (reliable transactions)
- JSON support (JSONB for session data)
- Excellent performance with indexes
- AWS RDS support (easy cloud deployment)
- Advanced features (triggers, functions)

### Authentication
**JSON Web Tokens (JWT) 9.0**

#### Features:
- Stateless authentication
- Access tokens (15 minutes)
- Refresh tokens (7 days)
- Secure token-based auth
- Mobile-friendly

### Security Libraries

**bcrypt 6.0** - Password hashing
- 12 salt rounds
- Industry-standard
- Secure password storage

**helmet 8.1** - Security headers
- XSS protection
- Content security policy
- HTTP security

**cors 2.8** - Cross-origin resource sharing
- Controls API access
- Security configuration

**express-validator 7.3** - Input validation
- Validates email, passwords, etc.
- Prevents SQL injection
- Sanitizes input

---

## 🔧 Development Tools

### Backend Development
- **nodemon** (v3.1) - Auto-restart on code changes
- **morgan** (v1.10) - HTTP request logger
- **dotenv** (v17.3) - Environment variables

### Mobile Development
- **Expo CLI** - Development server
- **Expo Go** - Testing app for iOS/Android
- **Metro bundler** - JavaScript bundler
- **React DevTools** - Debugging

### Version Control
- **Git** - Source control
- **GitHub** - Code hosting

---

## 🎵 Media & Features

### Text-to-Speech
**expo-speech** (v14.0)
- Native TTS on iOS and Android
- Multiple languages (EN, ES, FR, DE, HU)
- Adjustable speech rate
- Platform-native voices

### Haptic Feedback
**expo-haptics** (v15.0)
- Touch feedback
- Success/error vibrations
- iOS and Android support

### File System
**expo-file-system** (v19.0)
- Read/write files
- File operations
- Backup/export functionality

**expo-document-picker** (v14.0)
- File picker dialog
- Import functionality

**expo-sharing** (v14.0)
- Share exports
- Email/cloud export

---

## 🌐 HTTP & API

### Frontend HTTP Client
**axios** (included in dependencies)
- HTTP requests
- Interceptors (auto token refresh)
- Promise-based
- Request/response transformation

### Backend Middleware
**express middleware stack**
- JSON body parsing
- URL-encoded parsing
- CORS handling
- Security headers
- Request logging

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Mobile App                       │
│              (React Native + Expo)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  UI Layer (React Components)                 │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Navigation (Bottom Tabs + Stacks)           │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Services (Database, Auth, Sync, TTS)        │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Local Database (SQLite)                     │  │
│  └──────────────────────────────────────────────┘  │
│              ↕ HTTP (axios)                         │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                  Backend API                        │
│               (Node.js + Express)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  Routes (Auth, Users, Progress)              │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Controllers (Business Logic)                │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Models (Database Operations)                │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Middleware (Auth, Validation, Security)     │  │
│  └──────────────────────────────────────────────┘  │
│              ↕ SQL                                  │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│              Cloud Database                         │
│                 (PostgreSQL)                        │
│  • Users, Settings, Progress                        │
│  • Sessions, Achievements                           │
│  • Relational data with indexes                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Offline-First Architecture

**Local First**:
1. User interacts with app
2. Data saved to SQLite (instant)
3. App continues working (no internet needed)

**Sync Later**:
4. When online, sync to backend
5. Merge conflicts resolved
6. Cloud backup maintained

**Benefits**:
- Works without internet
- Fast response times
- Better user experience
- Data safety (local + cloud)

---

## 🚀 Deployment Options

### Mobile App

**Development**:
- Expo Go (current)
- Test on real devices
- Hot reload
- No app store needed

**Production**:
- **iOS**: App Store via EAS Build
- **Android**: Google Play Store via EAS Build
- **Web**: Netlify/Vercel deployment

### Backend API

**Development** (Current):
- Local Node.js server
- Local PostgreSQL database

**Production Options**:

1. **AWS** (Recommended):
   - EC2 or ECS (Docker)
   - RDS PostgreSQL
   - Elastic Load Balancer
   - CloudFront CDN
   - Auto-scaling

2. **Heroku**:
   - Heroku Dynos
   - Heroku Postgres
   - Easy deployment
   - Auto SSL

3. **DigitalOcean**:
   - App Platform
   - Managed PostgreSQL
   - Cost-effective

4. **Google Cloud / Azure**:
   - Cloud Run / App Service
   - Cloud SQL / Azure Database
   - Enterprise features

---

## 💰 Cost Breakdown

### Free Tier (Current)
- ✅ React Native - Free & open source
- ✅ Expo - Free tier available
- ✅ Node.js - Free & open source
- ✅ PostgreSQL - Free & open source
- ✅ All libraries - MIT/Apache licensed
- **Total**: $0/month

### Production (Estimated)
- Expo EAS Build: $29/month (for unlimited builds)
- AWS EC2 t3.small: $15/month
- AWS RDS PostgreSQL: $15/month
- Domain + SSL: $12/year
- **Total**: ~$60/month + $12/year

### Free Alternatives
- Expo builds (limited free)
- Heroku free tier (limited)
- Railway/Render free tier
- Can run for < $20/month

---

## 🎯 Why This Tech Stack?

### React Native + Expo
✅ Single codebase for iOS + Android  
✅ 70% faster development than native  
✅ Native performance  
✅ Large community  
✅ Regular updates  
✅ Used by: Facebook, Instagram, Discord, Shopify  

### Node.js + Express
✅ JavaScript everywhere (same language)  
✅ Fast development  
✅ Large ecosystem (npm)  
✅ Easy to scale  
✅ Good for APIs  
✅ Used by: Netflix, Uber, PayPal, LinkedIn  

### PostgreSQL
✅ Reliable & proven  
✅ Excellent performance  
✅ Free & open source  
✅ Cloud-ready (AWS RDS, etc.)  
✅ Advanced features  
✅ Used by: Apple, Spotify, Reddit, Instagram  

### SQLite (Mobile)
✅ Zero-configuration  
✅ Offline-first  
✅ Fast local queries  
✅ No server needed  
✅ Cross-platform  
✅ Used by: WhatsApp, Skype, Chrome, Firefox  

---

## 📈 Scalability

### Mobile App
- **Users**: Unlimited (local database)
- **Performance**: Native speed
- **Updates**: OTA (Over-the-air) via Expo
- **Offline**: Full functionality

### Backend API
- **Concurrent users**: 100s-1000s (depends on server)
- **Scaling**: Horizontal (add more servers)
- **Database**: Millions of users (PostgreSQL)
- **Caching**: Redis (can add later)
- **CDN**: CloudFront (static assets)

---

## 🔐 Security Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Transport | HTTPS/TLS | Encrypted communication |
| Auth | JWT | Stateless authentication |
| Passwords | bcrypt (12 rounds) | Secure hashing |
| Headers | Helmet.js | XSS, CSP protection |
| CORS | cors middleware | API access control |
| Input | express-validator | SQL injection prevention |
| Database | PostgreSQL | Parameterized queries |
| Tokens | Refresh tokens | Secure token rotation |

---

## 🌍 Internationalization

**Current Support**:
- 🇬🇧 English (interface)
- 🇪🇸 Spanish (vocabulary - 100%)
- 🇫🇷 French (vocabulary - 74%)
- 🇩🇪 German (vocabulary - 64%)
- 🇭🇺 Hungarian (vocabulary - 39%)

**Framework Ready**:
- Can easily add more UI languages
- TTS supports all 5 languages
- Database supports any language pair

---

## 📱 Platform Compatibility

### iOS
- **Minimum**: iOS 13.4
- **Recommended**: iOS 15+
- **Devices**: iPhone 6s and newer, all iPads
- **App Store**: Ready for submission

### Android
- **Minimum**: Android 6.0 (API 23)
- **Recommended**: Android 10+
- **Devices**: 95%+ of Android devices
- **Play Store**: Ready for submission

### Web (Progressive)
- **Browsers**: Chrome, Safari, Firefox, Edge
- **Mobile Web**: Full responsive
- **PWA**: Can install as web app
- **Desktop**: Works on all desktops

---

## 🎓 Learning Resources

### React Native
- Official Docs: https://reactnative.dev
- Expo Docs: https://docs.expo.dev
- React Navigation: https://reactnavigation.org

### Backend
- Express.js: https://expressjs.com
- PostgreSQL: https://postgresql.org/docs
- Node.js: https://nodejs.org/docs

### General
- JavaScript (ES6+): MDN Web Docs
- React: https://react.dev
- Git: https://git-scm.com/doc

---

## ✅ Summary

**WordMaster is a modern, cross-platform mobile application** built with:

- ✅ **Single codebase** works on iOS, Android, and Web
- ✅ **Native performance** using React Native
- ✅ **Offline-first** with local SQLite database
- ✅ **Cloud sync** with Node.js backend
- ✅ **Secure** with JWT + bcrypt + security headers
- ✅ **Scalable** architecture ready for millions of users
- ✅ **Modern** tech stack used by major companies
- ✅ **Cost-effective** (free for development, ~$60/month production)

**Platform Support**: ✅ iOS | ✅ Android | ✅ Web

**Status**: Production-ready, app store ready, scalable, secure
