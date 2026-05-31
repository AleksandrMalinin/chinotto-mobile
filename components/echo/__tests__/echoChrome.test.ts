import { echoAccentForKind, echoChromeColors, echoFragmentBorderForKind } from '../echoChrome';

describe('echoChrome', () => {
  it('uses warm vs cool accents by kind', () => {
    const chrome = echoChromeColors(true);
    expect(echoAccentForKind(chrome, 'gravity')).toBe(chrome.gravityAccent);
    expect(echoAccentForKind(chrome, 'drift')).toBe(chrome.driftAccent);
    expect(chrome.gravityAccent).not.toBe(chrome.driftAccent);
  });

  it('uses warm vs cool fragment borders without exposing kind labels', () => {
    const chrome = echoChromeColors(true);
    expect(echoFragmentBorderForKind(chrome, 'gravity')).toBe(chrome.fragmentBorderGravity);
    expect(echoFragmentBorderForKind(chrome, 'drift')).toBe(chrome.fragmentBorderDrift);
    expect(chrome.fragmentBorderGravity).not.toBe(chrome.fragmentBorderDrift);
  });

  it('echo veil is plum-shifted, not the same wash as stream accentSubtle', () => {
    const chrome = echoChromeColors(true);
    expect(chrome.echoVeil).toContain('112, 88, 152');
    expect(chrome.echoVeil).not.toBe('rgba(128,138,188,0.08)');
    expect(chrome.echoDepth).toBeTruthy();
    expect(chrome.echoGradientTop).toContain('140, 110, 185');
    expect(chrome.echoGradientBottom).toContain('52, 40, 78');
  });
});
