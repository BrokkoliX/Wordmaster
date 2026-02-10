# 🔐 Authentication Integration Guide

## ✅ Authentication Components Ready

You now have a complete authentication system:

**Services Layer**:
- `src/services/authService.js` - Handles all auth operations
- `src/contexts/AuthContext.js` - Provides auth state globally

**User Interface**:
- `src/screens/WelcomeScreen.js` - Entry point for new users
- `src/screens/LoginScreen.js` - Existing user authentication
- `src/screens/SignupScreen.js` - New user registration
- `src/screens/GuestEntryScreen.js` - Try without account

---

## 🚀 Integration Steps

### Step 1: Wire Up Authentication Flow

Modify your main app file to switch between auth screens and app screens based on login status.

**Target file**: `App.js` (or wherever your root component lives)

**Implementation approach**:

```javascript
// App.js - Root component
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Import auth screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import GuestEntryScreen from './src/screens/GuestEntryScreen';

// Import existing app screens
import HomeScreen from './src/screens/HomeScreen';
// ... your other screens

// Create a component that decides what to show
function AppContent() {
  const authState = useAuth();
  const { user, loading, initialized } = authState;

  // Wait for auth to initialize
  if (!initialized || loading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={loadingStyles.text}>Initializing...</Text>
      </View>
    );
  }

  // User is logged in - show main app
  if (user) {
    return <HomeScreen />;
  }

  // User not logged in - show welcome
  return <WelcomeScreen />;
}

// Wrap everything with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    color: '#6C6C70',
  },
});
```

**Note**: This simple version shows one screen at a time. For navigation between screens (Welcome → Login, etc.), you'll add React Navigation in the next step.

### Step 2: Update HomeScreen to Show User Info

**File**: `src/screens/HomeScreen.js`

Add this at the top:

```javascript
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  // Display user info
  return (
    <View>
      <Text>Welcome, {user.displayName || user.username}!</Text>
      {user.isGuest && (
        <TouchableOpacity onPress={() => navigation.navigate('UpgradeAccount')}>
          <Text>Upgrade to Full Account</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={logout}>
        <Text>Logout</Text>
      </TouchableOpacity>
      {/* ... rest of your HomeScreen ... */}
    </View>
  );
};
```

### Step 3: Sync User Stats with AuthContext

When user completes sessions, update their stats in the auth context.

**File**: `src/screens/SummaryScreen.js` (or wherever you track progress)

Add:

```javascript
import { useAuth } from '../contexts/AuthContext';

const SummaryScreen = ({ route }) => {
  const { updateStats } = useAuth();

  // After session completes
  useEffect(() => {
    const syncStats = async () => {
      const stats = {
        wordsLearned: totalWordsLearned,  // from your database
        sessionsCompleted: sessionsCount,
        currentStreak: streak,
        longestStreak: maxStreak,
        achievements: achievementCount
      };
      
      await updateStats(stats);
    };
    
    syncStats();
  }, []);
};
```

### Step 4: Install Dependencies

```bash
cd WordMasterApp
npm install @react-native-async-storage/async-storage
```

### Step 5: Test the Flow

1. **Start fresh**:
```bash
npx expo start -c
```

2. **Test scenarios**:
   - New user signup → Should create account
   - Existing user login → Should work
   - Guest mode → Should allow learning without account
   - Logout → Should return to Welcome screen

---

## Future: Migrate to Supabase

When ready for production, follow these steps:

### 1. Create Supabase Project

Visit https://supabase.com and create a free project.

### 2. Install Supabase

```bash
npm install @supabase/supabase-js
```

### 3. Update authService.js

Replace the local storage methods with Supabase calls:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Update signup method
async signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username
      }
    }
  });
  
  return { user: data.user, error };
}

// Update login method
async login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { user: data.user, error };
}

// Update logout method
async logout() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
```

### 4. Set Up User Profiles Table

In Supabase SQL Editor, run:

```sql
-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  native_language TEXT DEFAULT 'en',
  learning_languages TEXT[] DEFAULT '{}',
  current_cefr_level TEXT DEFAULT 'A1',
  total_words_learned INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Features Enabled by Authentication

### ✅ **Available Now** (Local Auth):
- User accounts
- Session persistence
- Guest mode
- Profile management
- Stats tracking

### 🔜 **After Supabase** (Cloud):
- Cloud sync across devices
- Password reset
- Email verification
- Social login (Google, Apple)
- Leaderboards
- Friend system
- Premium subscriptions

---

## User Flow Examples

### New User:
```
App Launch
  → Welcome Screen
  → Tap "Create Account"
  → Fill signup form
  → Account created
  → Redirected to Home
  → Start learning!
```

### Returning User:
```
App Launch
  → Auto-login (session persists)
  → Home Screen
  → Continue learning
```

### Guest User:
```
App Launch
  → Welcome Screen
  → Tap "Continue as Guest"
  → Guest Entry Screen
  → Confirm guest mode
  → Home Screen (with upgrade prompts)
  → Can upgrade later
```

---

## Testing Checklist

- [ ] Signup creates account
- [ ] Login works with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Guest mode works
- [ ] Session persists after app restart
- [ ] Logout works
- [ ] User stats update correctly
- [ ] Password validation works
- [ ] Email validation works

---

## Premium Features (For Later)

### Subscription Tiers:

**Free Tier**:
- 2 language pairs
- A1-B1 levels
- Basic achievements
- Local progress only

**Premium ($5/month)**:
- Unlimited language pairs
- All CEFR levels (A1-C2)
- All achievements
- Cloud sync
- Priority support
- Offline downloads

**Lifetime ($49 one-time)**:
- Everything in Premium
- Forever access
- Future features included

### Implementation:
Use Supabase + Stripe for subscriptions.

---

## Security Notes

### Current (Local Storage):
- ⚠️ Passwords stored locally (development only)
- ✅ Session persistence
- ✅ Input validation

### Production (Supabase):
- ✅ Passwords hashed server-side
- ✅ JWT tokens
- ✅ Row Level Security
- ✅ Email verification
- ✅ Rate limiting

**DO NOT deploy local storage auth to production!**

---

## Summary

**What you have**:
- Complete authentication system
- Beautiful UI screens
- Guest mode support
- Ready for Supabase migration

**What to do next**:
1. Update App.js with auth navigation (Step 1)
2. Install AsyncStorage (Step 4)
3. Test the flow (Step 5)
4. Later: Migrate to Supabase for cloud features

**Time to complete**: 1-2 hours for basic integration

---

**Ready to integrate?** Follow Step 1-5 above! 🚀
