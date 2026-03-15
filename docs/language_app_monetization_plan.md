# Wordmaster Monetization Plan

## Core Principle

Do not punish users with ads. Use ads as an optional trade: the free user hits a limit, then chooses to watch a rewarded video and continue, or upgrade to a paid tier. This creates a cleaner experience than intrusive banners or forced interruptions.

---

## 1. Tier Structure

Wordmaster already has three subscription tiers -- Free, Plus, and Super -- managed through admin-editable JSONB feature maps in `subscription_plans`. The monetization layer builds on top of this existing system rather than replacing it.

### Free

Access to core lessons, daily limited hearts, rewarded video to continue when hearts are depleted, occasional upgrade prompts. No banner ads during learning.

### Plus

No ads, unlimited hearts, unlimited practice, streak protection, all language pairs. This is the primary conversion target.

### Super

Everything in Plus, plus offline mode, advanced stats, custom word lists, priority support, and future premium features such as pronunciation help or AI explanations.

The difference between Plus and Super should be convenience and depth, not access to core learning. Free users should never feel punished; Plus users should feel comfortable; Super users should feel they have everything.

---

## 2. Ad Format

### Primary Format: Rewarded Video

Rewarded video is the only ad format at launch. The user runs out of hearts, sees a clear value proposition ("Watch a short video to get 3 more hearts"), and chooses whether to watch. The benefit is immediate and the user initiates the ad.

### Deferred Format: Rewarded Interstitial

Rewarded interstitials at natural checkpoints (lesson completed, daily challenge completed) can be considered in Phase 3. Do not ship with interstitials at launch. They add complexity to the UX and risk damaging retention before baseline metrics are established.

---

## 3. Hearts System

### How It Works

Free-tier users start each refill cycle with a fixed number of hearts. Each incorrect answer in a learning session costs one heart. When hearts reach zero, the user must choose a recovery path.

### Recovery Paths

**Wait.** Hearts refill naturally over time. The recommended starting rate is 1 heart every 20 minutes, which means a full refill from zero takes roughly 1 hour and 40 minutes for 5 hearts. This is short enough to retain casual learners who might abandon the app during a 2.5-hour wait.

**Watch a rewarded ad.** One rewarded video grants 3 hearts, capped at a configurable maximum per day.

**Upgrade.** Plus and Super tiers grant unlimited hearts.

### Onboarding Protection

New users are exempt from the hearts system during their first 24 hours or first 5 completed sessions, whichever comes first. This grace period lets users build investment in the app before encountering any monetization gate. The grace period is tracked by `account_created_at` and session count, both of which already exist in the database. The threshold values are admin-tunable via `serverConfig`.

---

## 4. Ad Trigger Plan

### Trigger 1: Hearts Depleted

This is the primary monetization trigger. When hearts reach zero, the app shows a blocking screen with three options: watch a video for 3 hearts, wait for natural refill, or upgrade. This screen is the main conversion funnel for both ad revenue and subscription upgrades.

### Trigger 2: Bonus Practice Unlock (Phase 2)

After the user finishes their daily free practice allocation, offer one additional practice set in exchange for a rewarded video. This only applies if daily challenge limits are implemented (see Feature Implementation Plan, Feature 3).

### Trigger 3: Streak Save (Phase 3)

A rewarded video can protect a streak once per 7 days for free-tier users. This limit is enforced server-side and tracked in `user_ad_events`. Using streak save more sparingly than heart refills prevents it from becoming a secondary daily ad trigger.

---

## 5. Anti-Patterns to Avoid

No banner ads in lesson screens. No forced video after every lesson. No ad after every mistake. No monetization gate during the onboarding grace period. No full-screen interstitials that the user did not opt into. These patterns damage retention and make the learning experience feel hostile.

---

## 6. Daily Ad Caps

The maximum number of rewarded ads a free user can watch per day is admin-configurable via `serverConfig`. Recommended starting values: 3 heart-refill videos per day, 1 bonus-practice video per day (Phase 2 only), and 1 streak-save video per 7 days (Phase 3 only). The effective ceiling for a heavy free user is 3 to 5 rewarded ads per day at launch.

These caps are enforced server-side. The mobile client reads the current caps from the subscription feature map on session start and uses them to decide whether to show the ad option, but the backend validates every ad-reward claim before granting hearts.

---

## 7. Subscription Pricing Structure

### Monthly Plus

The default paid option. Positioned as the core upgrade for committed learners.

### Yearly Plus

A discounted annual plan. The discount should be significant enough (30-40% savings) to make the annual commitment feel rewarding.

### Monthly Super / Yearly Super

Same structure at a higher price point, unlocking the full feature set.

### Free Trial Strategy

When a free user hits their first hearts-depleted screen, offer a 7-day free trial of Plus alongside the ad and wait options. This lets users experience unlimited hearts before committing to a subscription. The trial is offered once per account. After the trial expires, the user reverts to Free unless they subscribe. Trial state is tracked in `user_subscriptions` with `status = 'trial'` and an `expires_at` timestamp.

### Value Message

The subscription pitch should emphasize the learning benefits (unlimited hearts, unlimited practice, faster progress, premium exercises), not just ad removal. "Learn without limits" is a stronger message than "Remove ads."

---

## 8. UX Copy

### Hearts Depleted Screen

```
Out of hearts

You've used all your hearts for now.

[Watch a video]  Get 3 more hearts and keep learning
[Wait]           Hearts refill in ~20 minutes each
[Try Plus Free]  7 days of unlimited hearts, no ads
```

The trial option appears only if the user has not used their one-time trial. After the trial is consumed, the third option becomes a standard subscription prompt.

### Bonus Practice Screen (Phase 2)

```
Want one more practice set?

Watch a short video to unlock an extra round.
```

### Subscription Upsell

```
Learn without limits

Unlimited hearts. No ads. Full access to premium practice.
```

---

## 9. Technical Architecture

### Integration with Existing Systems

The hearts system and ad tracking integrate with three existing backend systems.

**`subscription_plans` JSONB features.** New feature keys are added to `featureKeys.js` and seeded into each plan's feature map. The `checkFeature` middleware gates heart-related endpoints by tier.

**`serverConfig` runtime settings.** All tunable parameters (starting hearts, refill rate, refill amount per ad, daily ad cap, grace period duration) are stored in `server_config` and editable from the admin UI without a server restart.

**`GET /api/subscriptions/me`.** The mobile client already calls this on session start. The response is extended to include heart-related feature values so the client can render the correct UI without hardcoding limits.

### New Feature Keys in `featureKeys.js`

```js
hearts_enabled:         { type: 'boolean', public: true  },
hearts_max:             { type: 'number',  public: true  },
hearts_refill_minutes:  { type: 'number',  public: true  },
hearts_ad_refill:       { type: 'number',  public: true  },
daily_ad_cap:           { type: 'number',  public: true  },
streak_save_enabled:    { type: 'boolean', public: true  },
free_trial_offered:     { type: 'boolean', public: false },
```

For Free, `hearts_enabled` is `true` and `hearts_max` is `5`. For Plus and Super, `hearts_enabled` is `false`, which means the client skips the hearts UI entirely. The values are admin-editable, so adjusting hearts from 5 to 7 for an A/B test requires no code change.

### New `serverConfig` Keys

```
hearts.starting_count         = 5
hearts.refill_interval_ms     = 1200000  (20 minutes)
hearts.ad_refill_amount       = 3
hearts.daily_ad_cap           = 3
hearts.grace_period_hours     = 24
hearts.grace_period_sessions  = 5
```

These are read at runtime by the hearts controller and can be changed from the admin panel.

### Server-Side Heart State

Heart state must be tracked server-side to prevent client-side manipulation. A user who clears local storage, modifies the SQLite database, or decompiles the client should not be able to reset their hearts or bypass daily ad caps.

#### New PostgreSQL Table: `user_hearts`

```sql
CREATE TABLE IF NOT EXISTS user_hearts (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_hearts INTEGER NOT NULL DEFAULT 5,
  last_refill_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### New PostgreSQL Table: `user_ad_events`

```sql
CREATE TABLE IF NOT EXISTS user_ad_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ad_events_user_date
  ON user_ad_events(user_id, created_at);
```

`event_type` values: `heart_refill`, `bonus_practice`, `streak_save`.

#### API Endpoints

`GET /api/hearts` returns the user's current heart count after applying any natural refill that has accrued since `last_refill_at`. The refill calculation happens in the query or controller, not via a background job. This avoids the need for a scheduler.

`POST /api/hearts/use` deducts one heart. Called by the mobile client after each incorrect answer. Returns the updated count. If the count reaches zero, the response includes a flag `hearts_depleted: true` so the client knows to show the recovery screen.

`POST /api/hearts/ad-refill` validates that the user has not exceeded their daily ad cap (by counting today's `heart_refill` rows in `user_ad_events`), then grants hearts and inserts an event row. The mobile client calls this after a rewarded video completes successfully. The ad SDK's server-side verification callback (AdMob S2S) should be used when available to confirm the ad was actually watched.

All three endpoints are gated behind `authenticate` middleware. Plus and Super users bypass the hearts system entirely (checked via `req.user.subscription_tier`).

### Local-First Compatibility

Wordmaster is local-first: all learning logic runs in SQLite on the device, and the backend is a sync target. The hearts system is an exception to this pattern because it is a monetization control, not a learning feature. Hearts are authoritative on the server, not in SQLite.

The mobile client caches the current heart count locally for offline display, but it cannot grant itself hearts. If the user is offline, the client allows continued learning with a locally cached heart count and queues heart-use events for sync when connectivity returns. If the cached count reaches zero offline, the client shows the "wait for refill" option only (no ad option, since ad verification requires connectivity). On reconnect, the client syncs queued events and fetches the authoritative heart count from the server.

This is a pragmatic compromise. A fully offline-enforced hearts system would require tamper-proof local storage, which is not achievable on mobile. Accepting that a small number of technically sophisticated users may bypass the system offline is preferable to blocking all offline learning or adding complex DRM.

### Rate Limiting

The hearts endpoints are added under a new rate limiter in `server.js`, consistent with the existing `authLimiter`, `adminLimiter`, and `subscriptionLimiter` pattern.

```js
const heartsLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.hearts', { windowMs: 900000 }).windowMs,
  max:      () => serverConfig.get('rate_limit.hearts', { max: 60 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many hearts requests', code: 'HEARTS_RATE_LIMITED' } },
});

app.use('/api/hearts', heartsLimiter, require('./routes/hearts.routes'));
```

---

## 10. Metrics

### Events to Track

Every heart depletion, ad offer shown, ad watch started, ad watch completed, ad-refill granted, trial started, trial converted, trial expired, subscription started, and subscription cancelled should be logged as a discrete event with a timestamp and user ID. These events go into a `monetization_events` table or an external analytics service.

### KPIs

Revenue per daily active user (ARPDAU), free-to-Plus conversion rate, free-to-Super conversion rate, trial-to-paid conversion rate, ad watch accept rate (ad watches / ad offers shown), hearts depleted rate (depletions / sessions), and churn rate within 7 days of first ad exposure.

### Cohort Segmentation

All retention and conversion metrics must be segmented by user tenure. A day-1 user watching a rewarded ad has different implications than a day-30 user doing the same. Recommended cohorts: day 0 (first session), days 1-7, days 8-30, and days 31+. The onboarding grace period means day-0 users should never appear in ad-related metrics.

### Key Question

The central metric to monitor is whether ad exposure damages retention. If day-7 retention for users who watched 3+ ads is significantly lower than for users who watched 0 ads (controlling for engagement level), the ad caps or trigger timing need adjustment.

---

## 11. A/B Tests

All test parameters are admin-configurable via `serverConfig`, so tests can be launched and adjusted without a code deployment.

### Test A: Starting Hearts

Compare 3, 5, and 7 starting hearts. Measure hearts-depleted rate, ad watch rate, and day-7 retention per variant. The hypothesis is that 5 is the sweet spot: 3 feels punitive, 7 delays monetization too long.

### Test B: Refill Amount Per Ad

Compare +2, +3, and full refill. Measure ads watched per user per day and session length after refill. The hypothesis is that +3 maximizes ad views without frustrating users, while full refill reduces total ad impressions.

### Test C: Refill Timer

Compare 15, 20, and 30 minutes per heart. Measure return rate (users who come back after depletion) and ad watch rate. The hypothesis is that 20 minutes balances patience-path viability against ad-path preference.

### Test D: Trial Timing

Compare offering the 7-day trial at first depletion, at second depletion, and after the user has watched 2 ads. Measure trial start rate and trial-to-paid conversion. The hypothesis is that offering after 2 ads lets users experience the ad path first, making the trial feel more valuable.

### Starting Configuration

5 hearts, +3 per ad, 20-minute refill interval, trial offered at first depletion.

---

## 12. Ad SDK Integration

### SDK Choice

Use `react-native-google-mobile-ads` (the maintained replacement for the deprecated `expo-ads-admob`). Rewarded video is the only format needed at launch. This requires an Expo development build, not Expo Go, since it includes native modules.

### Development Rules

Use test ad unit IDs during development. Never click real ads during testing. Use the AdMob test device registration feature for physical device testing. Keep the SDK version updated to avoid policy violations.

### Server-Side Verification

AdMob supports server-side verification (SSV) for rewarded ads. When a user completes a rewarded video, AdMob sends a callback to a configurable server URL with a signed payload. The `POST /api/hearts/ad-refill` endpoint should validate this callback before granting hearts. This prevents users from spoofing ad completions by replaying network requests.

SSV is optional at launch but strongly recommended before the app reaches significant scale. Without it, a user with a proxy tool can replay the ad-refill request and get unlimited hearts.

### Mediation

Ad mediation (serving ads from multiple networks to maximize fill rate and revenue) is a Phase 3 optimization. At launch, direct AdMob integration is sufficient. Mediation adds SDK complexity and should only be introduced once baseline revenue metrics are established.

---

## 13. Phased Rollout

### Phase 1: Hearts + Rewarded Video

Implement the hearts system with server-side state, the three recovery paths (wait, ad, upgrade), the onboarding grace period, and the one-time free trial. Ship with the starting configuration (5 hearts, +3 per ad, 20-minute refill, 3 ads/day cap). Begin tracking all monetization events.

New backend files: `hearts.routes.js`, `hearts.controller.js`, `hearts.model.js`, migration for `user_hearts` and `user_ad_events` tables, new feature keys in `featureKeys.js`, new settings in `serverConfig`.

New mobile files: `heartsService.js`, `OutOfHeartsScreen.js`, heart counter UI in learning screens, ad SDK integration.

### Phase 2: Bonus Practice + Yearly Plans

Add the bonus practice unlock via rewarded ad (1 per day). Add yearly subscription options for Plus and Super with 30-40% savings. Begin A/B testing heart parameters via `serverConfig`.

### Phase 3: Streak Save + Mediation + Optimization

Add streak save (1 per 7 days for free users). Add rewarded interstitials at lesson completion checkpoints (opt-in only). Add ad mediation. Optimize based on 60+ days of metrics data.

---

## 14. Files to Create

```
backend/src/routes/hearts.routes.js
backend/src/controllers/hearts.controller.js
backend/src/models/hearts.model.js
backend/src/scripts/migrations/create_hearts_tables.sql

mobile/src/services/heartsService.js
mobile/src/screens/OutOfHeartsScreen.js
```

## 15. Files to Modify

```
backend/src/config/featureKeys.js          New heart-related feature keys
backend/src/config/schema.sql              user_hearts and user_ad_events tables
backend/src/server.js                      heartsLimiter and hearts route mount

mobile/src/screens/LearningScreen.js       Deduct heart on incorrect answer, show OutOfHeartsScreen
mobile/src/screens/MatchingPairsScreen.js   Same heart deduction integration
mobile/src/screens/TypeTranslationScreen.js Same heart deduction integration
mobile/src/screens/FillInBlankScreen.js     Same heart deduction integration
mobile/src/services/progressSyncService.js  Sync queued heart-use events on reconnect
```

---

_Created: for planning purposes prior to development_
