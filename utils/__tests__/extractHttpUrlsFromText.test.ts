import { displayHostForUrl, extractHttpUrlsFromText } from '../extractHttpUrlsFromText';

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

describe('displayHostForUrl', () => {
  it('returns hostname without www', () => {
    expect(displayHostForUrl('https://www.wikipedia.org/wiki/Foo')).toBe('wikipedia.org');
  });

  it('returns null on invalid', () => {
    expect(displayHostForUrl('not a url')).toBeNull();
  });
});
