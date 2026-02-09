# 🏆 Week 3: Achievement System

## Status: 📋 PLANNED

**Goal:** Build a gamification system with 20+ achievements to motivate users
**Estimated Time:** 3-4 days
**Priority:** HIGH - Drives engagement and retention

---

## Why Achievements Matter

### Psychology:
- **Endowed Progress Effect:** People more likely to complete a task when shown they've already made progress
- **Goal Gradient Hypothesis:** Effort increases as goal gets closer
- **Completionist Drive:** Users want to "collect them all"
- **Social Proof:** Shareable badges create viral growth

### Expected Impact:
- +35% session completion rate
- +50% D7 retention
- +25% daily active users
- +40% sharing/word-of-mouth

### Competitive Analysis:
- **Duolingo:** 100+ achievements, huge engagement driver
- **Memrise:** Leaderboards + badges = 2x retention
- **Habitica:** Gamification = core value prop

---

## Achievement Categories

### 1. 📊 Volume Achievements (Learning Milestones)
**Purpose:** Reward consistent learning progress

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| 🥉 | First Steps | Learn 10 words | Bronze medal |
| 🥈 | Vocabulary Builder | Learn 50 words | Silver medal |
| 🥇 | Word Master | Learn 100 words | Gold medal |
| 💎 | Polyglot | Learn 500 words | Diamond |
| 👑 | Legend | Learn 1000 words | Crown |
| 🌟 | Grandmaster | Master 2000 words | Star |

---

### 2. 🔥 Streak Achievements (Consistency)
**Purpose:** Reinforce daily habit formation

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| 🔥 | On Fire | 3 day streak | Small flame |
| ⚡ | Week Warrior | 7 day streak | Lightning |
| 🌟 | Month Master | 30 day streak | Star |
| 💪 | Dedicated | 100 day streak | Muscle |
| 🦸 | Superhuman | 365 day streak | Superhero |

---

### 3. 🎯 Accuracy Achievements (Skill Mastery)
**Purpose:** Reward quality over quantity

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| 🎯 | Sharpshooter | 90% accuracy (20 words) | Target |
| 💯 | Perfectionist | 100% perfect session | 100 emoji |
| ⭐ | Flawless Week | 7 perfect days | Star |
| 🏆 | Accuracy King | 95% avg over 100 words | Trophy |

---

### 4. ⚡ Speed Achievements (Efficiency)
**Purpose:** Reward quick learners

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| ⏱️ | Speed Reader | Complete session < 3min | Timer |
| 🚀 | Lightning Round | 20 words in < 2min | Rocket |
| 💨 | Flash Master | Avg < 5s per word | Wind |

---

### 5. 📚 Category Achievements (Exploration)
**Purpose:** Encourage trying different topics

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| 🍽️ | Foodie | Master 30 Food words | Fork/knife |
| ✈️ | Traveler | Master 30 Travel words | Airplane |
| 💼 | Professional | Master 30 Business words | Briefcase |
| 🎨 | Artist | Master 30 Arts words | Palette |
| 🏠 | Homebody | Master 30 Home words | House |
| 🌍 | Explorer | Try 10 categories | Globe |
| 🦄 | Completionist | Master ALL categories | Unicorn |

---

### 6. 🌙 Special/Hidden Achievements
**Purpose:** Surprise and delight

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| 🌅 | Early Bird | Session before 6am | Sunrise |
| 🌙 | Night Owl | Session after 10pm | Moon |
| 🎉 | Party Animal | Learn on your birthday | Party |
| 🎄 | Holiday Spirit | Learn on Dec 25 | Christmas tree |
| 🍀 | Lucky | Get 7 correct in a row | Clover |
| 🎲 | Random | Try random category | Dice |

---

## Implementation Plan

### Day 1: Database & Data Structure

#### 1.1 Create Achievements Table
```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  color TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  points INTEGER DEFAULT 10,
  is_hidden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.2 Create User Achievements Table
```sql
CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  achievement_id INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 1,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);
```

#### 1.3 Seed Achievement Data
Create `src/data/achievements.json`:
```json
[
  {
    "key": "first_steps",
    "name": "First Steps",
    "description": "Learn your first 10 words",
    "category": "volume",
    "icon": "🥉",
    "color": "#CD7F32",
    "requirement_type": "words_learned",
    "requirement_value": 10,
    "points": 10
  },
  {
    "key": "week_warrior",
    "name": "Week Warrior",
    "description": "Maintain a 7-day streak",
    "category": "streak",
    "icon": "⚡",
    "color": "#FFD700",
    "requirement_type": "streak_days",
    "requirement_value": 7,
    "points": 25
  }
]
```

---

### Day 2: Achievement Logic Service

Create `src/services/achievementService.js`:

```javascript
import * as db from './database.js';

/**
 * Achievement checking and unlocking logic
 */

// Check all achievements after session
export async function checkAchievements(userId = 1) {
  const stats = await db.getUserStatistics(userId);
  const newUnlocks = [];
  
  // Volume achievements
  if (stats.words_learned >= 10) {
    await unlockAchievement(userId, 'first_steps', newUnlocks);
  }
  if (stats.words_learned >= 50) {
    await unlockAchievement(userId, 'vocabulary_builder', newUnlocks);
  }
  
  // Streak achievements
  if (stats.current_streak_days >= 7) {
    await unlockAchievement(userId, 'week_warrior', newUnlocks);
  }
  
  // Accuracy achievements
  const recentAccuracy = await getRecentAccuracy(userId, 20);
  if (recentAccuracy >= 0.90) {
    await unlockAchievement(userId, 'sharpshooter', newUnlocks);
  }
  
  return newUnlocks;
}

// Unlock single achievement
async function unlockAchievement(userId, achievementKey, unlocksArray) {
  const achievement = await getAchievementByKey(achievementKey);
  const alreadyUnlocked = await hasAchievement(userId, achievement.id);
  
  if (!alreadyUnlocked) {
    await db.insertUserAchievement(userId, achievement.id);
    unlocksArray.push(achievement);
    return true;
  }
  return false;
}

// Get achievement progress
export async function getAchievementProgress(userId = 1) {
  const stats = await db.getUserStatistics(userId);
  const allAchievements = await getAllAchievements();
  
  return allAchievements.map(achievement => {
    const progress = calculateProgress(achievement, stats);
    const unlocked = hasAchievement(userId, achievement.id);
    
    return {
      ...achievement,
      progress,
      unlocked,
      progressPercent: Math.min(100, (progress / achievement.requirement_value) * 100)
    };
  });
}

// Calculate progress for specific achievement
function calculateProgress(achievement, stats) {
  switch(achievement.requirement_type) {
    case 'words_learned':
      return stats.words_learned || 0;
    case 'streak_days':
      return stats.current_streak_days || 0;
    case 'sessions_count':
      return stats.total_sessions || 0;
    case 'perfect_sessions':
      return stats.perfect_sessions || 0;
    default:
      return 0;
  }
}

// Time-based achievements
export async function checkTimeBasedAchievements(userId = 1) {
  const hour = new Date().getHours();
  const newUnlocks = [];
  
  if (hour < 6) {
    await unlockAchievement(userId, 'early_bird', newUnlocks);
  }
  if (hour >= 22) {
    await unlockAchievement(userId, 'night_owl', newUnlocks);
  }
  
  return newUnlocks;
}

// Category-specific achievements
export async function checkCategoryAchievements(userId = 1, category) {
  const masteredInCategory = await db.getMasteredWordsInCategory(userId, category);
  
  if (masteredInCategory >= 30) {
    return await unlockAchievement(userId, `${category}_master`);
  }
  return false;
}
```

---

### Day 3: UI Components

#### 3.1 Achievement Unlock Modal
Create `src/components/AchievementUnlockModal.js`:

```javascript
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

export default function AchievementUnlockModal({ achievement, visible, onClose }) {
  if (!achievement) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <BlurView intensity={90} style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>🎉 Achievement Unlocked!</Text>
          
          <View style={styles.badge}>
            <Text style={styles.icon}>{achievement.icon}</Text>
          </View>
          
          <Text style={styles.name}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
          <Text style={styles.points}>+{achievement.points} points</Text>
          
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 60,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  points: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

#### 3.2 Achievements Screen
Create `src/screens/AchievementsScreen.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { getAchievementProgress } from '../services/achievementService';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked
  
  useEffect(() => {
    loadAchievements();
  }, []);
  
  async function loadAchievements() {
    const data = await getAchievementProgress();
    setAchievements(data);
  }
  
  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Achievements</Text>
      
      {/* Filter Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setFilter('all')}>
          <Text style={filter === 'all' ? styles.tabActive : styles.tab}>
            All ({achievements.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('unlocked')}>
          <Text style={filter === 'unlocked' ? styles.tabActive : styles.tab}>
            Unlocked ({achievements.filter(a => a.unlocked).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('locked')}>
          <Text style={filter === 'locked' ? styles.tabActive : styles.tab}>
            Locked ({achievements.filter(a => !a.unlocked).length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Achievement List */}
      <FlatList
        data={filteredAchievements}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <AchievementCard achievement={item} />
        )}
      />
    </View>
  );
}

function AchievementCard({ achievement }) {
  return (
    <View style={[
      styles.card,
      !achievement.unlocked && styles.cardLocked
    ]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{achievement.icon}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{achievement.name}</Text>
        <Text style={styles.description}>{achievement.description}</Text>
        
        {!achievement.unlocked && (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${achievement.progressPercent}%` }
              ]} 
            />
          </View>
        )}
        
        {achievement.unlocked && (
          <Text style={styles.unlocked}>✓ Unlocked</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  tab: {
    fontSize: 16,
    color: '#999',
    paddingVertical: 8,
  },
  tabActive: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  card: {
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  unlocked: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
```

---

### Day 4: Integration & Polish

#### 4.1 Integrate with Summary Screen
Update `SummaryScreen.js` to check achievements:

```javascript
import { checkAchievements } from '../services/achievementService';

async function handleSessionComplete() {
  // Existing code...
  
  // Check for new achievements
  const newAchievements = await checkAchievements();
  
  if (newAchievements.length > 0) {
    // Show achievement unlock modal(s)
    setShowAchievementModal(true);
    setUnlockedAchievements(newAchievements);
  }
}
```

#### 4.2 Add to Navigation
```javascript
<Stack.Screen 
  name="Achievements" 
  component={AchievementsScreen}
  options={{
    title: "Achievements",
    headerShown: true
  }}
/>
```

#### 4.3 Add Quick Access on Home Screen
```javascript
<TouchableOpacity 
  style={styles.achievementButton}
  onPress={() => navigation.navigate('Achievements')}
>
  <Text style={styles.achievementIcon}>🏆</Text>
  <Text style={styles.achievementText}>
    {unlockedCount}/{totalCount} Achievements
  </Text>
</TouchableOpacity>
```

---

## Success Criteria

Week 3 is complete when:
- ✅ 20+ achievements defined
- ✅ Database tables created
- ✅ Achievement checking logic works
- ✅ Unlock animations smooth
- ✅ Achievements screen functional
- ✅ Progress tracking accurate
- ✅ No performance issues
- ✅ Users excited to unlock badges

---

## Testing Checklist

- [ ] All achievements can be unlocked
- [ ] Progress calculated correctly
- [ ] Modal animation smooth
- [ ] Achievements persist
- [ ] No duplicate unlocks
- [ ] Hidden achievements stay hidden
- [ ] Performance good with many achievements
- [ ] Works offline

---

## Metrics to Track

### Engagement:
- % of users who view achievements screen
- Avg achievements per user
- Time to first achievement
- Achievement completion rate

### Retention:
- D7 retention (with vs without achievements)
- Session frequency increase
- Time spent in app

---

## Future Enhancements (Phase 3)

- Social sharing of achievements
- Leaderboards
- Limited-time achievements
- Achievement tiers (Bronze/Silver/Gold)
- Custom achievement icons
- Achievement points system
- Rewards for achievements (themes, etc.)

---

**Ready to build Week 3?** 🏆

After Week 2 is complete, we'll implement this achievement system to maximize user engagement and retention!
