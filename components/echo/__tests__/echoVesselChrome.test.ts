import { echoFragmentChrome } from '../echoVesselChrome';
import { echoChromeColors } from '../echoChrome';

describe('echoFragmentChrome', () => {
  it('returns per-fragment surface palette from echo chrome', () => {
    const chrome = echoChromeColors(true);
    const darkTheme = {
      isDark: true,
      sunlightMode: false,
      colors: {
        accentSubtle: 'rgba(128,138,188,0.08)',
      },
    } as Parameters<typeof echoFragmentChrome>[0];

    const fragment = echoFragmentChrome(darkTheme, chrome);

    expect(fragment.fill).toBe(chrome.fragmentFill);
    expect(fragment.border).toBe(chrome.fragmentBorder);
    expect(fragment.pressed).toBe('rgba(128,138,188,0.08)');
  });
});
