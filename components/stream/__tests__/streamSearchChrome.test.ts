import { getTheme } from '../../../theme';
import { streamSearchChrome } from '../streamSearchChrome';

describe('streamSearchChrome', () => {
  it('returns glass tokens for idle and active', () => {
    const t = getTheme();
    const idle = streamSearchChrome(t, false);
    const active = streamSearchChrome(t, true);
    expect(idle.blurIntensity).toBeGreaterThan(0);
    expect(active.blurIntensity).toBeGreaterThanOrEqual(idle.blurIntensity);
    expect(idle.borderGradientIdle.length).toBe(3);
    expect(active.borderGradientActive.length).toBe(3);
    expect(idle.shadowIdle).toBeTruthy();
    expect(active.shadowActive).toBeTruthy();
    expect(idle.veil).toContain('168');
  });
});
