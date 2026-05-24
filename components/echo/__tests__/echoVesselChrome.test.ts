import { echoVesselChrome } from '../echoVesselChrome';
import { echoChromeColors } from '../echoChrome';

describe('echoVesselChrome', () => {
  it('returns one grouped surface palette', () => {
    const darkTheme = {
      isDark: true,
      sunlightMode: false,
      colors: {
        surfaceSearch: 'rgba(255,255,255,0.015)',
        streamDivider: 'rgba(255,255,255,0.07)',
        accentSubtle: 'rgba(128,138,188,0.08)',
      },
    } as Parameters<typeof echoVesselChrome>[0];

    const vessel = echoVesselChrome(darkTheme, echoChromeColors(true));

    expect(vessel.fill).toBe('rgba(255,255,255,0.015)');
    expect(vessel.separator).toBe('rgba(255,255,255,0.07)');
    expect(vessel.rowPressed).toBe('rgba(128,138,188,0.08)');
  });
});
