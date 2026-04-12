import { resolveUpdateGate, withStoreUrl } from '../resolveUpdateGate';
import type { UpdateConfig } from '../types';

const base: UpdateConfig = {
  enabled: true,
  minSupportedVersion: '1.0.0',
  latestVersion: '2.0.0',
  forceUpdate: false,
};

describe('resolveUpdateGate', () => {
  it('returns null when disabled', () => {
    expect(resolveUpdateGate('1.0.0', { ...base, enabled: false })).toBeNull();
  });

  it('returns null when current is invalid', () => {
    expect(resolveUpdateGate('dev', base)).toBeNull();
  });

  it('returns null when already at latest', () => {
    expect(resolveUpdateGate('2.0.0', base)).toBeNull();
    expect(resolveUpdateGate('2.0.1', base)).toBeNull();
  });

  it('forces when below min', () => {
    const g = resolveUpdateGate('0.9.0', base);
    expect(g?.kind).toBe('forced');
    expect(g?.title).toBe('Update required');
    expect(g?.message).toBe('A newer version is needed.');
  });

  it('forces when below latest and forceUpdate', () => {
    const g = resolveUpdateGate('1.5.0', { ...base, forceUpdate: true });
    expect(g?.kind).toBe('forced');
  });

  it('soft when below latest but at or above min', () => {
    const g = resolveUpdateGate('1.5.0', base);
    expect(g?.kind).toBe('soft');
    expect(g?.title).toBe('New version available');
    expect(g?.message).toBe('Stay current.');
  });

  it('uses custom title and message when provided', () => {
    const g = resolveUpdateGate('1.5.0', {
      ...base,
      title: 'Heads up',
      message: 'Please refresh.',
    });
    expect(g?.kind).toBe('soft');
    expect(g?.title).toBe('Heads up');
    expect(g?.message).toBe('Please refresh.');
  });
});

describe('withStoreUrl', () => {
  it('attaches iOS URL', () => {
    const gate = resolveUpdateGate('1.5.0', base)!;
    const w = withStoreUrl(gate, 'ios', {
      ...base,
      iosStoreUrl: 'https://apps.apple.com/app/example',
      androidStoreUrl: 'https://play.example',
    });
    expect(w.storeUrl).toBe('https://apps.apple.com/app/example');
  });

  it('attaches Android URL', () => {
    const gate = resolveUpdateGate('1.5.0', base)!;
    const w = withStoreUrl(gate, 'android', {
      ...base,
      iosStoreUrl: 'https://apps.apple.com/app/example',
      androidStoreUrl: 'https://play.example',
    });
    expect(w.storeUrl).toBe('https://play.example');
  });

  it('null store on web', () => {
    const gate = resolveUpdateGate('1.5.0', base)!;
    const w = withStoreUrl(gate, 'web', {
      ...base,
      iosStoreUrl: 'https://apps.apple.com/app/example',
    });
    expect(w.storeUrl).toBeNull();
  });
});
