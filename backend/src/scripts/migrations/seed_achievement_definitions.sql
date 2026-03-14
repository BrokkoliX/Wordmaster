-- Seed achievement_definitions for the admin panel.
-- Matches the 32 definitions hard-coded in mobile/src/services/achievementDatabase.js.
-- Safe to re-run: ON CONFLICT updates existing rows.

INSERT INTO achievement_definitions
  (id, category, title, description, icon, rarity, points, unlock_criteria, hidden, order_index)
VALUES
  -- Category 1: First Steps (Onboarding)
  ('first_word',        'first_steps', 'First Word',        'Learn your first word',                          '🌱', 'common',    10,  '{"type":"words_practiced","value":1}',                          false, 1),
  ('first_session',     'first_steps', 'Getting Started',   'Complete your first learning session',            '🎯', 'common',    20,  '{"type":"sessions_completed","value":1}',                       false, 2),
  ('first_day',         'first_steps', 'Day One Complete',   'Finish your first day of learning',              '✅', 'common',    30,  '{"type":"days_practiced","value":1}',                           false, 3),
  ('first_level_up',    'first_steps', 'Rising Star',       'Advance to a new CEFR level',                    '⭐', 'uncommon',  50,  '{"type":"level_advanced","value":1}',                           false, 4),
  ('settings_visited',  'first_steps', 'Customizer',        'Personalize your learning experience',           '⚙️', 'common',    10,  '{"type":"settings_changed","value":1}',                         false, 5),

  -- Category 2: Streak Warriors (Consistency)
  ('streak_3',          'streaks',     'Streak Starter',     'Learn for 3 days in a row',                      '🔥', 'common',    30,  '{"type":"streak_days","value":3}',                              false, 10),
  ('streak_7',          'streaks',     'Week Warrior',       'Maintain a 7-day learning streak',               '🔥', 'uncommon',  100, '{"type":"streak_days","value":7}',                              false, 11),
  ('streak_14',         'streaks',     'Dedicated Learner',  'Two weeks of consistent practice',               '🔥', 'uncommon',  200, '{"type":"streak_days","value":14}',                             false, 12),
  ('streak_30',         'streaks',     'Month Master',       '30 days of unstoppable learning',                '🔥', 'rare',      500, '{"type":"streak_days","value":30}',                             false, 13),
  ('streak_100',        'streaks',     'Centurion',          '100 days of dedication - truly impressive!',     '💯', 'epic',      2000,'{"type":"streak_days","value":100}',                            false, 14),
  ('streak_365',        'streaks',     'Legendary Streak',   'One full year of daily learning - you''re a legend!', '👑', 'legendary', 10000, '{"type":"streak_days","value":365}',                       false, 15),

  -- Category 3: Word Mastery (Volume)
  ('words_10',          'mastery',     'Vocabulary Builder',  'Master 10 words',                               '📚', 'common',    20,  '{"type":"words_mastered","value":10}',                          false, 20),
  ('words_50',          'mastery',     'Word Collector',      'Master 50 words',                               '📚', 'uncommon',  100, '{"type":"words_mastered","value":50}',                          false, 21),
  ('words_100',         'mastery',     'Hundred Club',        'Master 100 words',                              '💯', 'uncommon',  200, '{"type":"words_mastered","value":100}',                         false, 22),
  ('words_250',         'mastery',     'Word Enthusiast',     'Master 250 words',                              '📖', 'rare',      500, '{"type":"words_mastered","value":250}',                         false, 23),
  ('words_500',         'mastery',     'Vocabulary Master',   'Master 500 words - conversational fluency!',    '🎓', 'rare',      1000,'{"type":"words_mastered","value":500}',                         false, 24),
  ('words_1000',        'mastery',     'Word Wizard',         'Master 1000 words - you''re unstoppable!',      '🧙‍♂️', 'epic',     2500,'{"type":"words_mastered","value":1000}',                        false, 25),
  ('words_5000',        'mastery',     'Polyglot Legend',     'Master 5000 words - near-native proficiency!',  '🌟', 'legendary', 10000,'{"type":"words_mastered","value":5000}',                       false, 26),

  -- Category 4: Speed Learning (Efficiency)
  ('speed_20_in_10min', 'speed',       'Quick Learner',       'Complete 20 words in under 10 minutes',        '⚡', 'uncommon',  50,  '{"type":"session_speed","words":20,"max_seconds":600}',         false, 30),
  ('speed_50_in_session','speed',      'Speed Demon',         'Learn 50 words in a single session',           '🚀', 'rare',      150, '{"type":"session_words","value":50}',                           false, 31),
  ('speed_100_in_session','speed',     'Marathon Runner',     'Incredible! 100 words in one session',         '🏃', 'epic',      500, '{"type":"session_words","value":100}',                          false, 32),
  ('morning_learner',   'speed',       'Early Bird',          'Complete a session before 8 AM',               '🌅', 'uncommon',  30,  '{"type":"session_hour","max_hour":8}',                          false, 33),

  -- Category 5: Perfect Performance (Accuracy)
  ('perfect_10',        'accuracy',    'Perfect Start',       'Get 10 words correct in a row',                '✨', 'uncommon',  50,  '{"type":"consecutive_correct","value":10}',                     false, 40),
  ('perfect_20',        'accuracy',    'Flawless',            'Get 20 words correct in a row',                '💎', 'rare',      150, '{"type":"consecutive_correct","value":20}',                     false, 41),
  ('session_100_percent','accuracy',   'Perfectionist',       'Complete a session with 100% accuracy',        '🎯', 'rare',      200, '{"type":"session_accuracy","value":100,"min_words":20}',        false, 42),
  ('avg_accuracy_90',   'accuracy',    'Accuracy Expert',     'Maintain 90%+ accuracy over 100 words',        '🏅', 'epic',      500, '{"type":"overall_accuracy","value":90,"min_words":100}',        false, 43),

  -- Category 6: Language Explorer (Diversity)
  ('languages_2',       'explorer',    'Polyglot Apprentice', 'Start learning a second language',             '🌍', 'uncommon',  100, '{"type":"languages_count","value":2}',                          false, 50),
  ('languages_3',       'explorer',    'Multilingual',        'Learn 3 different languages',                  '🌎', 'rare',      300, '{"type":"languages_count","value":3}',                          false, 51),
  ('languages_5',       'explorer',    'Language Master',     'Learn 5 different languages!',                 '🌏', 'epic',      1000,'{"type":"languages_count","value":5}',                          false, 52),

  -- Category 7: Special/Hidden (Easter Eggs)
  ('night_owl',         'special',     'Night Owl',           'Learn after midnight - dedication!',           '🦉', 'uncommon',  30,  '{"type":"session_hour","min_hour":0,"max_hour":5}',             true,  60),
  ('comeback_kid',      'special',     'Comeback Kid',        'Resume learning after 30+ days away',          '🎉', 'uncommon',  50,  '{"type":"days_inactive","value":30}',                           true,  61),
  ('categories_10',     'special',     'Category Explorer',   'Practice words from 10 different categories',  '🗂️', 'rare',      150, '{"type":"categories_count","value":10}',                        false, 62)

ON CONFLICT (id) DO UPDATE SET
  category       = EXCLUDED.category,
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  icon           = EXCLUDED.icon,
  rarity         = EXCLUDED.rarity,
  points         = EXCLUDED.points,
  unlock_criteria = EXCLUDED.unlock_criteria,
  hidden         = EXCLUDED.hidden,
  order_index    = EXCLUDED.order_index,
  updated_at     = NOW();
