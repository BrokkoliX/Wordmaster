import {
  calculateStreak,
  getStreakLevel,
  getStreakMessage,
  completedToday,
  formatStreakDisplay,
  checkMilestoneReached,
} from '../services/streakService';

describe('calculateStreak', () => {
  test('returns 0 when lastActivityDate is null', () => {
    expect(calculateStreak(null)).toBe(0);
  });

  test('returns 0 when last activity was today', () => {
    const today = new Date().toISOString();
    expect(calculateStreak(today)).toBe(0);
  });

  test('returns 1 when last activity was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(calculateStreak(yesterday.toISOString())).toBe(1);
  });

  test('returns -1 when streak is broken (2+ days gap)', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(calculateStreak(threeDaysAgo.toISOString())).toBe(-1);
  });
});

describe('getStreakLevel', () => {
  test('returns level 0 for 0 days', () => {
    expect(getStreakLevel(0).level).toBe(0);
  });

  test('returns level 1 for 1 day', () => {
    expect(getStreakLevel(1).level).toBe(1);
  });

  test('returns level 2 for 7 days', () => {
    expect(getStreakLevel(7).level).toBe(2);
  });

  test('returns level 5 for 365 days', () => {
    expect(getStreakLevel(365).level).toBe(5);
  });
});

describe('completedToday', () => {
  test('returns false for null', () => {
    expect(completedToday(null)).toBe(false);
  });

  test('returns true for today', () => {
    expect(completedToday(new Date().toISOString())).toBe(true);
  });

  test('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(completedToday(yesterday.toISOString())).toBe(false);
  });
});

describe('formatStreakDisplay', () => {
  test('returns "No Streak" for 0', () => {
    expect(formatStreakDisplay(0)).toBe('No Streak');
  });

  test('returns "1 Day" for 1', () => {
    expect(formatStreakDisplay(1)).toBe('1 Day');
  });

  test('returns "15 Days" for 15', () => {
    expect(formatStreakDisplay(15)).toBe('15 Days');
  });
});

describe('checkMilestoneReached', () => {
  test('returns null when no milestone is crossed', () => {
    expect(checkMilestoneReached(5, 6)).toBeNull();
  });

  test('returns milestone info when crossing 7 days', () => {
    const result = checkMilestoneReached(6, 7);
    expect(result).not.toBeNull();
    expect(result.days).toBe(7);
  });

  test('returns milestone info when crossing 30 days', () => {
    const result = checkMilestoneReached(29, 30);
    expect(result).not.toBeNull();
    expect(result.days).toBe(30);
  });

  test('does not re-trigger an already-passed milestone', () => {
    expect(checkMilestoneReached(8, 9)).toBeNull();
  });
});

describe('getStreakMessage', () => {
  test('returns starting message for 0 streak', () => {
    const msg = getStreakMessage(0, 0);
    expect(msg).toContain('Start');
  });

  test('returns personal record message when applicable', () => {
    const msg = getStreakMessage(15, 15);
    expect(msg).toContain('record');
  });
});
