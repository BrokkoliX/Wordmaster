# User Management Implementation Plan

## 📋 Overview

**Goal**: Add user authentication and management to Wordmaster

**Components**:
1. Backend API (Node.js/Express)
2. Frontend Integration (React Native)
3. Database (SQLite → PostgreSQL migration)
4. AWS Deployment Ready

---

## 🎯 Phase 1: Backend API Development

### Tech Stack
- **Framework**: Express.js
- **Auth**: JWT (JSON Web Tokens)
- **Database**: PostgreSQL (AWS RDS ready)
- **ORM**: Prisma or Sequelize
- **Validation**: Joi or Zod
- **Security**: bcrypt, helmet, cors

### API Endpoints

#### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
```

#### User Profile
```
GET    /api/users/me
PUT    /api/users/me
DELETE /api/users/me
PUT    /api/users/me/password
POST   /api/users/me/avatar
```

#### Progress Sync
```
GET  /api/progress/sync
POST /api/progress/sync
GET  /api/progress/stats
POST /api/progress/backup
GET  /api/progress/backups
```

#### Achievements
```
GET  /api/achievements
GET  /api/achievements/user
POST /api/achievements/unlock
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User progress (synced from mobile)
CREATE TABLE user_word_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id VARCHAR(100) NOT NULL,
  status VARCHAR(50),
  confidence_level INTEGER,
  consecutive_correct INTEGER,
  ease_factor DECIMAL(3,2),
  interval_days INTEGER,
  next_review_date DATE,
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, word_id)
);

-- Learning sessions
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  words_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- User settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  cefr_level VARCHAR(10),
  known_language VARCHAR(10),
  learning_language VARCHAR(10),
  tts_enabled BOOLEAN DEFAULT TRUE,
  tts_rate DECIMAL(3,2) DEFAULT 0.75,
  daily_goal INTEGER DEFAULT 20,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_progress_user_id ON user_word_progress(user_id);
CREATE INDEX idx_user_progress_next_review ON user_word_progress(user_id, next_review_date);
CREATE INDEX idx_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_achievements_user_id ON user_achievements(user_id);
```

---

## 🔐 Security Implementation

### Password Security
```javascript
// bcrypt for hashing
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### JWT Tokens
```javascript
// Access token (short-lived, 15 minutes)
const accessToken = jwt.sign(
  { userId, email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token (long-lived, 7 days)
const refreshToken = jwt.sign(
  { userId },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### Middleware
```javascript
// Authentication middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 📱 Phase 2: Frontend Integration

### AsyncStorage → API Migration

**Before** (Local only):
```javascript
await AsyncStorage.setItem('cefrLevel', 'A1');
```

**After** (Sync with backend):
```javascript
// Save locally first (offline support)
await AsyncStorage.setItem('cefrLevel', 'A1');

// Sync with backend
if (isOnline && isAuthenticated) {
  await api.updateUserSettings({ cefrLevel: 'A1' });
}
```

### API Client Setup

```javascript
// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.wordmaster.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle token refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          await AsyncStorage.setItem('accessToken', data.accessToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return axios(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          await logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth Service

```javascript
// src/services/authService.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  async register(email, password, username) {
    const { data } = await api.post('/auth/register', {
      email,
      password,
      username,
    });
    
    await this.saveTokens(data.accessToken, data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  }

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    
    await this.saveTokens(data.accessToken, data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  }

  async logout() {
    await api.post('/auth/logout');
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'user',
    ]);
  }

  async getCurrentUser() {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  }

  private async saveTokens(accessToken, refreshToken) {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }
}

export default new AuthService();
```

### Sync Service

```javascript
// src/services/syncService.js
import api from './api';
import { exportProgress } from './exportService';
import { importProgress } from './exportService';

class SyncService {
  async syncProgress() {
    try {
      // Get local progress
      const localProgress = await exportProgress();
      
      // Upload to server
      const { data } = await api.post('/progress/sync', {
        progress: localProgress.data.progress,
        sessions: localProgress.data.sessions,
        achievements: localProgress.data.achievements,
        timestamp: new Date().toISOString(),
      });
      
      // If server has newer data, merge it
      if (data.serverProgress) {
        await importProgress(data.serverProgress, 'merge');
      }
      
      return { success: true, synced: true };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async enableAutoSync(interval = 300000) { // 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncProgress();
    }, interval);
  }

  disableAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export default new SyncService();
```

---

## 🖥️ New Screens

### 1. Login Screen
```
┌─────────────────────────────────────┐
│                                     │
│        📚 WordMaster                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Email                         │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Password            [👁]      │ │
│  └───────────────────────────────┘ │
│                                     │
│  [ Forgot Password? ]               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │         LOG IN                │ │
│  └───────────────────────────────┘ │
│                                     │
│  ─────────  or  ─────────          │
│                                     │
│  [ Continue as Guest ]              │
│                                     │
│  Don't have an account? Sign up     │
└─────────────────────────────────────┘
```

### 2. Register Screen
```
┌─────────────────────────────────────┐
│  ← Back      Create Account         │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ Email                         │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Username                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Password                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Confirm Password              │ │
│  └───────────────────────────────┘ │
│                                     │
│  □ I agree to Terms & Privacy      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │       CREATE ACCOUNT          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. Profile Screen (Enhanced)
```
┌─────────────────────────────────────┐
│  👤 Profile              [⚙️ Settings] │
├─────────────────────────────────────┤
│      [Avatar]                       │
│   Robbie Szekely                    │
│   @robbie                           │
│   Member since Feb 2024             │
├─────────────────────────────────────┤
│  📊 Stats                           │
│  ├─ 1,234 words mastered           │
│  ├─ 25 hours studied               │
│  └─ 15 day streak 🔥               │
├─────────────────────────────────────┤
│  🌍 Languages                       │
│  Currently: English → French        │
│  [ Switch Language ]                │
├─────────────────────────────────────┤
│  🏆 Achievements                    │
│  12 / 25 unlocked                   │
│  [ View All → ]                     │
├─────────────────────────────────────┤
│  ☁️  Sync & Backup                  │
│  Last synced: 2 min ago ✓           │
│  [ Manual Sync ]                    │
├─────────────────────────────────────┤
│  [ Edit Profile ]                   │
│  [ Settings ]                       │
│  [ Logout ]                         │
└─────────────────────────────────────┘
```

---

## 🔄 Migration Strategy

### Step 1: Backend Development (Week 1-2)
1. Setup Express.js project
2. Configure PostgreSQL
3. Implement auth endpoints
4. Implement sync endpoints
5. Add tests
6. Deploy to staging

### Step 2: Frontend Integration (Week 2-3)
1. Add API client
2. Create auth screens
3. Implement auth flow
4. Add sync functionality
5. Test offline mode
6. Test sync conflicts

### Step 3: Data Migration (Week 3)
1. Export existing users' data
2. Allow guest → registered user conversion
3. Provide migration guide
4. Support rollback

### Step 4: Testing & Deployment (Week 4)
1. End-to-end testing
2. Load testing
3. Security audit
4. Deploy to production
5. Monitor & fix issues

---

## 📊 Effort Estimation

| Phase | Task | Time |
|-------|------|------|
| **Backend** | Setup & Database | 4h |
| | Auth Endpoints | 6h |
| | User Profile Endpoints | 4h |
| | Progress Sync Endpoints | 8h |
| | Testing | 6h |
| **Frontend** | API Client Setup | 3h |
| | Auth Screens | 8h |
| | Auth Flow | 6h |
| | Profile Screen | 6h |
| | Sync Integration | 8h |
| | Testing | 6h |
| **Migration** | Data Export/Import | 4h |
| | Guest Conversion | 4h |
| | Documentation | 2h |
| **Total** | | **75h** (~2-3 weeks) |

---

## 🚀 Next: AWS Migration Plan

See `AWS_MIGRATION_PLAN.md` for deployment details.

**Status**: Plan created, ready for implementation.
