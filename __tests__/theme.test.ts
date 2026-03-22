import { screenContentGutter } from '../theme';

describe('screenContentGutter', () => {
  it('uses a 20px horizontal inset', () => {
    expect(screenContentGutter(320)).toBe(20);
    expect(screenContentGutter(600)).toBe(20);
  });
});
