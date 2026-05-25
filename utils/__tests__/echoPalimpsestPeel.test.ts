import { palimpsestPeelDragOffset } from '../echoPalimpsestPeel';

describe('palimpsestPeelDragOffset', () => {
  it('returns zero for non-positive drag', () => {
    expect(palimpsestPeelDragOffset(0)).toBe(0);
    expect(palimpsestPeelDragOffset(-4)).toBe(0);
  });

  it('applies resistance after threshold', () => {
    expect(palimpsestPeelDragOffset(20)).toBe(20);
    expect(palimpsestPeelDragOffset(32)).toBe(28.8);
  });
});
