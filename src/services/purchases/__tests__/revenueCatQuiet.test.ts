import { isRevenueCatQuietMode } from '../revenueCatQuiet';

describe('isRevenueCatQuietMode', () => {
  const key = 'EXPO_PUBLIC_REVENUECAT_QUIET';
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env[key];
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
  });

  it('is false when unset', () => {
    delete process.env[key];
    expect(isRevenueCatQuietMode()).toBe(false);
  });

  it('is true for 1 / true / yes (case-insensitive)', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', ' Yes ']) {
      process.env[key] = v;
      expect(isRevenueCatQuietMode()).toBe(true);
    }
  });
});
