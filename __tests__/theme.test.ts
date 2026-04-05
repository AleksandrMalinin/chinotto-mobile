import {
  colorsDark,
  colorsSunlight,
  resolveAppTheme,
  screenContentGutter,
  screenContentInnerPad,
} from '../theme';

describe('resolveAppTheme (sunlight mode)', () => {
  it('uses standard dark tokens when sunlight is off', () => {
    const t = resolveAppTheme(false);
    expect(t.sunlightMode).toBe(false);
    expect(t.isDark).toBe(true);
    expect(t.colors.bg).toBe(colorsDark.bg);
    expect(t.colors.fg).toBe(colorsDark.fg);
    expect(t.colors.searchBorder).toBe(colorsDark.searchBorder);
  });

  it('uses high-contrast dark tokens when sunlight is on', () => {
    const t = resolveAppTheme(true);
    expect(t.sunlightMode).toBe(true);
    expect(t.isDark).toBe(true);
    expect(t.colors.bg).toBe(colorsSunlight.bg);
    expect(t.colors.fg).toBe(colorsSunlight.fg);
    expect(t.colors.fgDim).toBe(colorsSunlight.fgDim);
    expect(t.colors.border).toBe(colorsSunlight.border);
    expect(t.colors.surfaceSearch).toBe(colorsSunlight.surfaceSearch);
    expect(t.colors.searchBorder).toBe(colorsSunlight.searchBorder);
    expect(t.colors.streamDivider).toBe(colorsSunlight.streamDivider);
  });
});

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
