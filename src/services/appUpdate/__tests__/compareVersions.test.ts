import { compareSemanticVersions, isVersionLessThan, parseSemver } from '../compareVersions';

describe('parseSemver', () => {
  it('parses release triples', () => {
    expect(parseSemver('1.2.3')).toEqual({ numbers: [1, 2, 3], prerelease: null });
    expect(parseSemver('  10.0.1  ')).toEqual({ numbers: [10, 0, 1], prerelease: null });
  });

  it('parses prerelease', () => {
    expect(parseSemver('1.0.0-rc.1')).toEqual({
      numbers: [1, 0, 0],
      prerelease: ['rc', '1'],
    });
  });

  it('rejects invalid cores', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('v1.0.0')).toBeNull();
    expect(parseSemver('1.x.0')).toBeNull();
    expect(parseSemver('01.0.0')).toBeNull();
  });
});

describe('compareSemanticVersions', () => {
  it('orders numeric segments', () => {
    expect(compareSemanticVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemanticVersions('1.10.0', '1.2.0')).toBe(1);
    expect(compareSemanticVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('treats missing patch as zero', () => {
    expect(compareSemanticVersions('1.0', '1.0.0')).toBe(0);
    expect(compareSemanticVersions('1.0', '1.0.1')).toBe(-1);
  });

  it('orders prerelease before release', () => {
    expect(compareSemanticVersions('1.0.0-beta', '1.0.0')).toBe(-1);
    expect(compareSemanticVersions('1.0.0', '1.0.0-beta')).toBe(1);
  });

  it('compares prerelease lexically', () => {
    expect(compareSemanticVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(compareSemanticVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1);
  });

  it('returns null for invalid', () => {
    expect(compareSemanticVersions('1.0', 'bad')).toBeNull();
    expect(compareSemanticVersions('x', '1.0.0')).toBeNull();
  });
});

describe('isVersionLessThan', () => {
  it('mirrors compare', () => {
    expect(isVersionLessThan('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionLessThan('1.0.1', '1.0.0')).toBe(false);
    expect(isVersionLessThan('bad', '1.0.0')).toBeNull();
  });
});
