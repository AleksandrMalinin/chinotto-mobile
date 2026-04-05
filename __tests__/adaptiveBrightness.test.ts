import {
  BRIGHTNESS_ENTER_SUNLIGHT,
  BRIGHTNESS_EXIT_SUNLIGHT,
  nextSunlightTarget,
} from '../theme/adaptiveBrightness';

describe('nextSunlightTarget (hysteresis)', () => {
  it('stays normal until brightness reaches enter threshold', () => {
    expect(nextSunlightTarget(false, BRIGHTNESS_ENTER_SUNLIGHT - 0.01)).toBe(false);
    expect(nextSunlightTarget(false, BRIGHTNESS_ENTER_SUNLIGHT)).toBe(true);
    expect(nextSunlightTarget(false, 1)).toBe(true);
  });

  it('stays sunlight until brightness drops below exit threshold', () => {
    expect(nextSunlightTarget(true, BRIGHTNESS_EXIT_SUNLIGHT)).toBe(true);
    expect(nextSunlightTarget(true, BRIGHTNESS_EXIT_SUNLIGHT - 0.01)).toBe(false);
    expect(nextSunlightTarget(true, 0)).toBe(false);
  });

  it('holds previous mode inside the hysteresis band', () => {
    const mid = (BRIGHTNESS_ENTER_SUNLIGHT + BRIGHTNESS_EXIT_SUNLIGHT) / 2;
    expect(nextSunlightTarget(false, mid)).toBe(false);
    expect(nextSunlightTarget(true, mid)).toBe(true);
  });
});
