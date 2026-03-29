import { screenContentGutter, screenContentInnerPad } from '../theme';

describe('screenContentGutter', () => {
  it('uses a 20px horizontal inset', () => {
    expect(screenContentGutter(320)).toBe(20);
    expect(screenContentGutter(600)).toBe(20);
  });
});

describe('screenContentInnerPad', () => {
  it('insets capture composer (and stream rows); search stays on gutter line', () => {
    expect(screenContentInnerPad).toBe(12);
  });
});
