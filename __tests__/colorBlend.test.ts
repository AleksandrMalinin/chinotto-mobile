import { blendColorPair } from '../theme/colorBlend';

describe('blendColorPair', () => {
  it('returns endpoints unchanged at t=0 and t=1', () => {
    const a = '#000000';
    const b = '#ffffff';
    expect(blendColorPair(a, b, 0)).toBe(a);
    expect(blendColorPair(a, b, 1)).toBe(b);
  });

  it('interpolates hex midpoints', () => {
    const mid = blendColorPair('#000000', '#ffffff', 0.5);
    expect(mid.toLowerCase()).toBe('#808080');
  });

  it('interpolates rgba alpha', () => {
    const mid = blendColorPair('rgba(0,0,0,0)', 'rgba(255,255,255,1)', 0.5);
    expect(mid).toMatch(/rgba\(128,128,128,0\.5\)/);
  });
});
