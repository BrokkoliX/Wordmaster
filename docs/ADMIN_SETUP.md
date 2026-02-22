# WordMaster Admin Panel Setup Guide

## 🎯 Overview

This guide explains how to set up and use the admin system for WordMaster, which includes:
- **API Endpoints** for user management, language management, and statistics (accessible from web/mobile)
- **Admin Web Interface** recommendations for database management

---

## 📋 Prerequisites

1. PostgreSQL database running
2. Backend server running
3. Admin user with proper role

---

## 🚀 Step 1: Database Setup

### Add Role Column to Users Table

Run the migration script to add admin roles:

```bash
psql -U your_username -d wordmaster_db -f backend/src/scripts/add_user_roles.sql
```

Or manually:

```sql
-- Connect to your database and run:
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Promote yourself to admin (replace with your email):
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## 🔑 Step 2: Admin Authentication

### Option A: Manual Token Creation
After logging in via `/api/auth/login`, use the returned JWT token for admin API calls.

### Option B: Dedicated Admin Login
You can create a separate admin login endpoint or use your existing auth with role checking.

---

## 📡 Step 3: API Endpoints Available

All admin endpoints are prefixed with `/api/admin` and require:
- Authentication (JWT token)
- Admin role

### User Management
```
GET    /api/admin/users              # List all users (with search & pagination)
GET    /api/admin/users/:id          # Get user details
PUT    /api/admin/users/:id          # Update user (role, email_verified, etc.)
DELETE /api/admin/users/:id          # Delete user
GET    /api/admin/users/:id/progress # Get user's learning progress
```

### Language & Vocabulary Management
```
GET    /api/admin/languages          # Get all language pairs with stats
POST   /api/admin/languages          # Register new language pair
GET    /api/admin/words/stats        # Get word database statistics
POST   /api/admin/words/import       # Bulk import words (JSON)
DELETE /api/admin/words/:id          # Delete a word
PUT    /api/admin/words/:id          # Update a word
```

### Sentence Templates
```
GET    /api/admin/sentences          # Get all sentence templates
POST   /api/admin/sentences          # Add new sentence
PUT    /api/admin/sentences/:id      # Update sentence
DELETE /api/admin/sentences/:id      # Delete sentence
```

### Platform Statistics
```
GET    /api/admin/stats              # Overall platform stats
GET    /api/admin/stats/users        # User growth & demographics
GET    /api/admin/stats/learning     # Learning statistics
GET    /api/admin/database/health    # Database health check
```

---

## 💻 Step 4: Build Admin Web Interface

### Recommended Option 1: React Admin
Use [React Admin](https://marmelab.com/react-admin/) framework:

```bash
# In a new directory for admin frontend
npx create-react-app wordmaster-admin
cd wordmaster-admin
npm install react-admin ra-data-simple-rest
```

Create `src/App.js`:
```javascript
import React from 'react';
import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import authProvider from './authProvider';

const dataProvider = simpleRestProvider('http://localhost:3000/api/admin');

const App = () => (
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="users" list={ListGuesser} edit={EditGuesser} />
    <Resource name="languages" list={ListGuesser} />
    <Resource name="words/stats" list={ListGuesser} />
  </Admin>
);

export default App;
```

### Recommended Option 2: AdminJS (Simplest)
Install AdminJS directly in your backend:

```bash
cd backend
npm install adminjs @adminjs/express @adminjs/sql @adminjs/postgresql
```

Add to your `server.js`:
```javascript
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const { Database, Resource } = require('@adminjs/sql');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = await new Database('postgresql', pool);

const adminOptions = {
  resources: [
    {
      resource: db.table('users'),
      options: {
        properties: {
          password_hash: { isVisible: false },
        },
      },
    },
    { resource: db.table('words') },
    { resource: db.table('sentence_templates') },
  ],
  rootPath: '/admin',
};

const admin = new AdminJS(adminOptions);
const adminRouter = AdminJSExpress.buildRouter(admin);
app.use(admin.options.rootPath, adminRouter);
```

Then access at: `http://localhost:3000/admin`

### Recommended Option 3: Custom Simple Dashboard
Use vanilla HTML/JavaScript with your existing API endpoints.

---

## 📊 Usage Examples

### Import Words via API

```bash
# Prepare your JSON file (words.json):
[
  {
    "word": "bonjour",
    "translation": "hello",
    "cefr_level": "A1",
    "difficulty": 1,
    "frequency_rank": 1
  },
  {
    "word": "merci",
    "translation": "thank you",
    "cefr_level": "A1",
    "difficulty": 1,
    "frequency_rank": 2
  }
]

# Import using curl:
curl -X POST http://localhost:3000/api/admin/words/import \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_lang": "en",
    "target_lang": "fr",
    "words": '$(cat words.json)'
  }'
```

### Get Platform Statistics

```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Response:
{
  "users": {
    "total": 1523,
    "active": 342
  },
  "words": 45000,
  "sessions": 8934,
  "averageAccuracy": "78.50"
}
```

### Search Users

```bash
curl -X GET "http://localhost:3000/api/admin/users?search=john&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Update User Role

```bash
curl -X PUT http://localhost:3000/api/admin/users/USER_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "moderator"}'
```

---

## 🔒 Security Considerations

1. **Always use HTTPS in production**
2. **Implement rate limiting** on admin endpoints
3. **Log all admin actions** for audit trail
4. **Use strong JWT secrets**
5. **Implement IP whitelisting** for admin access if possible
6. **Add 2FA** for admin accounts
7. **Regular security audits**

---

## 🎨 Admin Interface Features to Implement

### Essential Features:
- ✅ User management (view, edit, delete, change roles)
- ✅ Word database statistics
- ✅ Bulk word import (JSON/CSV)
- ✅ Language pair management
- ✅ Platform analytics dashboard
- ✅ Database health monitoring

### Advanced Features (Future):
- [ ] Automated word import from frequency lists
- [ ] User activity logs
- [ ] Content moderation tools
- [ ] A/B testing management
- [ ] Email campaign management
- [ ] Backup/restore interface
- [ ] Performance monitoring
- [ ] API usage analytics

---

## 📱 Mobile App Access

The API endpoints work for both web and mobile apps. For mobile:

1. **User can query their own data** via existing `/api/users/me` endpoints
2. **Language selection** via `/api/words/languages`
3. **Word fetching** via `/api/words?source_lang=en&target_lang=es`

**Admin functions** (user management, word imports) are **web-only** for security and usability.

---

## 🛠️ Testing Admin Endpoints

Use Postman, Insomnia, or curl to test:

```bash
# 1. Login as admin
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}' \
  | jq -r '.token')

# 2. Get all users
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# 3. Get word stats
curl -X GET http://localhost:3000/api/admin/words/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔄 Next Steps

1. **Run the database migration** to add role column
2. **Promote yourself to admin** in the database
3. **Test the API endpoints** with curl or Postman
4. **Choose an admin interface** (AdminJS recommended for speed)
5. **Deploy** when ready

---

## 📞 Support

For issues or questions:
- Check logs: `backend/logs/`
- Verify database connection
- Ensure JWT token is valid
- Check user has `admin` role in database

---

## 📚 Additional Resources

- [AdminJS Documentation](https://docs.adminjs.co/)
- [React Admin Documentation](https://marmelab.com/react-admin/)
- [PostgreSQL Admin Guide](https://www.postgresql.org/docs/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
