import {
  chinottoHeadlineTextGradient,
  colorsDark,
  colorsSunlight,
  resolveAppTheme,
  screenContentGutter,
  screenContentInnerPad,
} from '../theme';

describe('resolveAppTheme (adaptive blend)', () => {
  it('uses standard dark tokens at blend 0', () => {
    const t = resolveAppTheme(0);
    expect(t.blendProgress).toBe(0);
    expect(t.mode).toBe('normal');
    expect(t.sunlightMode).toBe(false);
    expect(t.isDark).toBe(true);
    expect(t.colors.bg).toBe(colorsDark.bg);
    expect(t.colors.fg).toBe(colorsDark.fg);
    expect(t.colors.searchBorder).toBe(colorsDark.searchBorder);
    expect(t.colors.capturePlaceholder).toBe(colorsDark.capturePlaceholder);
  });

  it('uses sunlight tokens at blend 1', () => {
    const t = resolveAppTheme(1);
    expect(t.blendProgress).toBe(1);
    expect(t.mode).toBe('sunlight');
    expect(t.sunlightMode).toBe(true);
    expect(t.isDark).toBe(true);
    expect(t.colors.bg).toBe(colorsSunlight.bg);
    expect(t.colors.fg).toBe(colorsSunlight.fg);
    expect(t.colors.fgDim).toBe(colorsSunlight.fgDim);
    expect(t.colors.border).toBe(colorsSunlight.border);
    expect(t.colors.surfaceSearch).toBe(colorsSunlight.surfaceSearch);
    expect(t.colors.searchBorder).toBe(colorsSunlight.searchBorder);
    expect(t.colors.streamDivider).toBe(colorsSunlight.streamDivider);
    expect(t.colors.capturePlaceholder).toBe(colorsSunlight.capturePlaceholder);
  });

  it('crosses sunlight mode at the blend midpoint', () => {
    expect(resolveAppTheme(0.49).mode).toBe('normal');
    expect(resolveAppTheme(0.5).mode).toBe('sunlight');
  });

  it('blends a color between dark and sunlight at t=0.5', () => {
    const t = resolveAppTheme(0.5);
    expect(t.colors.bg).not.toBe(colorsDark.bg);
    expect(t.colors.bg).not.toBe(colorsSunlight.bg);
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

describe('chinottoHeadlineTextGradient', () => {
  it('mirrors desktop --chinotto-headline-text-gradient stops', () => {
    expect(chinottoHeadlineTextGradient.colors).toHaveLength(4);
    expect(chinottoHeadlineTextGradient.locations).toHaveLength(4);
    expect(chinottoHeadlineTextGradient.start).toEqual({ x: 0.12, y: 0 });
    expect(chinottoHeadlineTextGradient.end).toEqual({ x: 0.88, y: 1 });
  });
});
