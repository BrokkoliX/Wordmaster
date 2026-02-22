# 🚀 WordMaster - Quick Start Guide

**For your next development session - read this first!**

---

## 📋 What You Need to Know

**Project Status:** Just reorganized into monorepo + admin backend ready  
**Last Commit:** `f9bdacc` - Development status document added  
**Main Document:** Read `CURRENT_STATUS.md` for full context

---

## ⚡ Quick Commands

```bash
# Start mobile app
cd mobile && npx expo start --ios
# OR use: ./START_APP.sh

# Start backend API
cd backend && node src/server.js

# Install all dependencies
npm run install:all
```

---

## 🎯 Your Next 3 Tasks

### 1️⃣ **Run Database Migration** (5 min)
Add the `role` column to enable admin access:

```bash
psql -U postgres -d wordmaster_db -f backend/src/scripts/add_user_roles.sql

# Make yourself admin:
# UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 2️⃣ **Test Admin API** (10 min)
```bash
# Start backend
cd backend && node src/server.js

# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}'

# Test admin endpoint (use token from login)
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3️⃣ **Build Admin Interface** (2-4 hours)

**Quick Option (30 min):**
```bash
cd backend
npm install adminjs @adminjs/express @adminjs/sql @adminjs/postgresql
# Then follow: docs/ADMIN_SETUP.md
```

**Better Option (2-4 hours):**
```bash
cd admin
npm install
npm run dev
# Build UI with React Admin
```

---

## 📁 Project Structure

```
mobile/     ← React Native app (iOS/Android)
backend/    ← Express API + PostgreSQL + Admin routes ✅
admin/      ← Admin panel (needs UI built) ⏳
data/       ← Word frequency lists
shared/     ← Common utilities
docs/       ← All documentation
```

---

## 🔑 Key Files to Read

1. **`CURRENT_STATUS.md`** ← Read this for full context
2. **`docs/ADMIN_SETUP.md`** ← Admin system guide
3. **`README.md`** ← Project overview

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `lsof -ti :3000 \| xargs kill -9` |
| Database error | Check `backend/.env` |
| Module not found | Run `npm install` in that folder |
| Admin API 403 | Check user role is 'admin' in DB |

---

## 🎓 What's Working vs. What's Not

✅ **Working:**
- Mobile app (full features)
- Backend API (all endpoints)
- Admin API endpoints (backend)
- User authentication

⏳ **Needs Work:**
- Admin web UI (not built yet)
- Database migration (not run yet)
- Admin user setup (not done yet)

---

## 💡 Recommended Workflow for Today

1. **Pull latest code:** `git pull origin main`
2. **Read:** `CURRENT_STATUS.md` (10 min)
3. **Run:** Database migration (5 min)
4. **Test:** Admin API with curl (10 min)
5. **Choose:** AdminJS (quick) or React Admin (better)
6. **Build:** Admin interface (2-4 hours)
7. **Commit:** Your changes

---

## 📊 Admin API Endpoints Available

```
User Management:     /api/admin/users
Language Management: /api/admin/languages
Word Management:     /api/admin/words
Statistics:          /api/admin/stats
Health Check:        /api/admin/database/health
```

**Full list:** See `CURRENT_STATUS.md` section "Admin API Endpoints Available"

---

## 🔗 Important Links

- **Repository:** https://github.com/BrokkoliX/Wordmaster.git
- **React Admin Docs:** https://marmelab.com/react-admin/
- **AdminJS Docs:** https://docs.adminjs.co/

---

## 📞 Quick Help

**Can't remember something?**
- Check `CURRENT_STATUS.md` for details
- Check `docs/ADMIN_SETUP.md` for admin setup
- Check controller files for API endpoint logic
- Check `backend/src/config/schema.sql` for database structure

---

**🎯 Goal for Today:** Get admin system working (migration → test API → build UI)

**⏱️ Estimated Time:** 3-5 hours total

**📍 Start Here:** `CURRENT_STATUS.md` → Section "Next Steps"

---

_Last Updated: February 22, 2024_  
_Commit: f9bdacc_
