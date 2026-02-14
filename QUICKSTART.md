# WordMaster - Quick Start Guide

Get WordMaster running in 10 minutes.

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- iOS/Android device with Expo Go app
- Git

---

## Step 1: Clone Repository

```bash
git clone https://github.com/BrokkoliX/Wordmaster.git
cd Wordmaster
```

---

## Step 2: Setup Backend

### Install PostgreSQL (macOS)

```bash
brew install postgresql@14
brew services start postgresql@14
```

### Create Database

```bash
createdb wordmaster
psql -d wordmaster -f backend/src/config/schema.sql
```

**Verify**:
```bash
psql -d wordmaster -c "\dt"
# Should show 8 tables
```

### Configure & Start

```bash
cd backend

# .env already configured for local development
# Verify database settings in .env if needed

npm install
npm run dev
```

**Expected output**:
```
🚀 Server running on port 3000
📍 Environment: development
🔗 Health check: http://localhost:3000/health
✅ Database connected
```

### Test Backend

In a new terminal:
```bash
curl http://localhost:3000/health
```

**Expected response**:
```json
{
  "status": "OK",
  "timestamp": "2024-02-13T...",
  "uptime": 1.234
}
```

---

## Step 3: Start Mobile App

### Install & Run

```bash
cd WordMasterApp
npm install
npx expo start
```

### Connect Device

1. Install **Expo Go** on your phone (App Store/Play Store)
2. Scan the QR code displayed in terminal
3. Wait for app to load (~30 seconds first time)

### Test App

1. See bottom navigation (Home, Learn, Progress, Profile)
2. Tap through all tabs
3. Go to **Learn** tab → Start learning session
4. Try a few words
5. Check **Progress** tab → See achievements
6. Go to **Profile** tab → See settings

---

## Step 4: Test Integration (Optional)

### Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "username": "testuser"
  }'
```

**Save the accessToken** from response.

### Test Protected Endpoint

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Progress Sync

```bash
# First, create some progress in the app
# Then test sync endpoint

curl -X POST http://localhost:3000/api/progress/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": [],
    "sessions": [],
    "achievements": []
  }'
```

---

## What's Working

✅ **Mobile App**:
- 5 languages (EN↔ES, FR, DE, HU)
- 83,000+ word pairs
- Bottom tab navigation
- Learning sessions
- Achievements
- Local database
- TTS pronunciation

✅ **Backend API**:
- User registration/login
- JWT authentication
- User profiles
- Progress tracking
- Statistics
- Settings management

✅ **Integration**:
- API client with auto-refresh
- Sync service (ready)
- Offline-first architecture

---

## Troubleshooting

### PostgreSQL Issues

**Database doesn't exist**:
```bash
createdb wordmaster
```

**Permission denied**:
```bash
# Create postgres user
createuser -s postgres
```

**Can't connect**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Restart if needed
brew services restart postgresql@14
```

### Backend Issues

**Port 3000 in use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in backend/.env
PORT=3001
```

**Database connection error**:
- Check `backend/.env` database credentials
- Verify PostgreSQL is running
- Check database name matches

### Mobile App Issues

**Expo won't start**:
```bash
# Clear cache
npx expo start -c
```

**App won't load on device**:
- Ensure device on same WiFi as computer
- Check firewall settings
- Try localhost tunnel: `npx expo start --tunnel`

**Database errors in app**:
```bash
# Delete and reinstall
rm -rf WordMasterApp/node_modules
cd WordMasterApp
npm install
```

---

## Next Steps

### For Development

1. **Make changes** to code
2. **Test locally** (backend: nodemon auto-restarts)
3. **Commit changes**: `git add -A && git commit -m "..."`
4. **Push to GitHub**: `git push origin main`

### For Production

See `USER_MANAGEMENT_PLAN.md` for AWS deployment guide:
1. Setup EC2/ECS
2. Setup RDS PostgreSQL
3. Configure environment variables
4. Deploy backend
5. Update mobile app API URL
6. Build & publish app

---

## Useful Commands

### Backend

```bash
# Development
npm run dev

# Production
npm start

# Database shell
psql -d wordmaster

# View tables
psql -d wordmaster -c "\dt"

# View table structure
psql -d wordmaster -c "\d users"
```

### Mobile App

```bash
# Start development
npx expo start

# Clear cache
npx expo start -c

# Use tunnel (for different networks)
npx expo start --tunnel

# View logs
npx expo start --dev-client
```

### Git

```bash
# Status
git status

# Commit
git add -A
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main
```

---

## Help & Support

- **Documentation**: See `*.md` files in project root
- **API Docs**: `backend/README.md`
- **Issues**: https://github.com/BrokkoliX/Wordmaster/issues

---

**You're all set! Start learning languages with WordMaster! 🎉**
