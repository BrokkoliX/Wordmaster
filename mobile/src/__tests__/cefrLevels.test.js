const {
  CEFR_LEVELS,
  CEFR_LEVEL_ORDER,
  getLevelsUpTo,
  compareLevels,
} = require('../../../shared/constants/cefr-levels');

describe('CEFR_LEVELS', () => {
  test('contains exactly 6 levels in order', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
});

describe('getLevelsUpTo', () => {
  test('returns only A1 for level A1', () => {
    expect(getLevelsUpTo('A1')).toEqual(['A1']);
  });

  test('returns A1 through B1 for level B1', () => {
    expect(getLevelsUpTo('B1')).toEqual(['A1', 'A2', 'B1']);
  });

  test('returns all levels for C2', () => {
    expect(getLevelsUpTo('C2')).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
});

describe('compareLevels', () => {
  test('A1 < B1', () => {
    expect(compareLevels('A1', 'B1')).toBe(-1);
  });

  test('C2 > A1', () => {
    expect(compareLevels('C2', 'A1')).toBe(1);
  });

  test('B1 == B1', () => {
    expect(compareLevels('B1', 'B1')).toBe(0);
  });
});
