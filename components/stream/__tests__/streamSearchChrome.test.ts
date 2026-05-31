import { getTheme, resolveAppTheme } from '../../../theme';
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
    expect(idle.innerFill).toContain('15, 15, 20');
    expect(idle.veil).toContain('10, 10, 14');
  });

  it('sunlight keeps dark glass inside the glow so type stays legible', () => {
    const t = resolveAppTheme(1);
    expect(t.sunlightMode).toBe(true);
    const idle = streamSearchChrome(t, false);
    const active = streamSearchChrome(t, true);
    expect(idle.blurTint).toBe('systemUltraThinMaterialDark');
    expect(idle.innerFill).toContain('29, 33, 48');
    expect(active.innerFill).toContain('29, 33, 48');
    expect(idle.veil).toContain('19, 18, 28');
    expect(idle.specularTop).toBe('rgba(255, 255, 255, 0.1)');
  });
});
