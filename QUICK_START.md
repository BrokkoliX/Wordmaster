# 🚀 WordMaster - Quick Start Guide

**For your next development session - read this first!**

---

## 📋 What You Need to Know

**Project Status:** Admin UI built, backend + password reset deployed to AWS  
**Main Document:** Read `CURRENT_STATUS.md` for full context

---

## ⚡ Quick Commands

```bash
# Start admin panel (connects to AWS backend via proxy)
cd admin && npm run dev
# Opens on http://localhost:5173

# Start mobile app
cd mobile && npx expo start --ios
```

---

## 🎯 Your Next 3 Tasks

### 1️⃣ **Start the Admin Panel** (1 min)
```bash
cd admin && npm run dev
# Open http://localhost:5173
# Login with your admin email + password
```

### 2️⃣ **Deploy Admin UI to EC2** (15 min)
Follow `docs/ADMIN_DEPLOYMENT.md` to serve it at `https://3.211.219.221/admin`.

### 3️⃣ **Import Language Data** (30 min)
Use the "Import Words" page in the admin panel to bulk-import vocabulary from JSON files.

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
- Backend API (all endpoints, deployed on AWS)
- Admin API endpoints + password reset
- Admin web UI (dashboard, users, languages, word import)
- User authentication with role-based access
- Database migration applied on AWS RDS

⏳ **Needs Work:**
- Admin UI deployment to EC2 nginx
- Rate limiting on admin endpoints
- Audit logging for admin actions

---

## 💡 Recommended Workflow for Today

1. **Pull latest code:** `git pull origin main`
2. **Read:** `CURRENT_STATUS.md` (5 min)
3. **Start admin:** `cd admin && npm run dev`
4. **Deploy:** Admin UI to EC2 (see `docs/ADMIN_DEPLOYMENT.md`)
5. **Import:** Language data via admin panel
6. **Commit:** Your changes

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

**🎯 Goal for Today:** Deploy admin UI to EC2 and import language data.

**📍 Start Here:** `cd admin && npm run dev` → `http://localhost:5173`

---

_Last Updated: February 23, 2025_
