import {
  displayHostForUrl,
  extractHttpUrlsFromText,
  replaceHttpUrlsWithCompactDisplay,
} from '../extractHttpUrlsFromText';

describe('extractHttpUrlsFromText', () => {
  it('returns empty for blank', () => {
    expect(extractHttpUrlsFromText('')).toEqual([]);
    expect(extractHttpUrlsFromText('   ')).toEqual([]);
  });

  it('finds a single https URL', () => {
    expect(extractHttpUrlsFromText('see https://example.com/path')).toEqual(['https://example.com/path']);
  });

  it('strips trailing punctuation from match', () => {
    expect(extractHttpUrlsFromText('Link (https://a.com/b).')).toEqual(['https://a.com/b']);
  });

  it('dedupes exact same URL repeated', () => {
    expect(extractHttpUrlsFromText('https://a.com/x https://a.com/x')).toEqual(['https://a.com/x']);
  });

  it('preserves order for distinct URLs', () => {
    const t = 'https://a.com first https://b.com';
    expect(extractHttpUrlsFromText(t)).toEqual(['https://a.com', 'https://b.com']);
  });

  it('does not match non-http schemes', () => {
    expect(extractHttpUrlsFromText('ftp://x.com mailto:a@b.co')).toEqual([]);
  });
});

describe('replaceHttpUrlsWithCompactDisplay', () => {
  it('returns empty string unchanged', () => {
    expect(replaceHttpUrlsWithCompactDisplay('')).toBe('');
  });

  it('leaves non-URL text unchanged', () => {
    expect(replaceHttpUrlsWithCompactDisplay('just a thought')).toBe('just a thought');
  });

  it('shortens URL to host only when path is root', () => {
    expect(replaceHttpUrlsWithCompactDisplay('see https://www.example.com/')).toBe('see example.com');
  });

  it('keeps host and path for deep links', () => {
    expect(
      replaceHttpUrlsWithCompactDisplay('read https://en.wikipedia.org/wiki/Tea')
    ).toBe('read en.wikipedia.org/wiki/Tea');
  });

  it('truncates very long paths', () => {
    const long = `https://example.com/${'a'.repeat(50)}`;
    const out = replaceHttpUrlsWithCompactDisplay(`x ${long} y`);
    expect(out.startsWith('x example.com/')).toBe(true);
    expect(out).toContain('…');
    expect(out.endsWith(' y')).toBe(true);
  });
});

describe('displayHostForUrl', () => {
  it('returns hostname without www', () => {
    expect(displayHostForUrl('https://www.wikipedia.org/wiki/Foo')).toBe('wikipedia.org');
  });

  it('returns null on invalid', () => {
    expect(displayHostForUrl('not a url')).toBeNull();
  });
});
