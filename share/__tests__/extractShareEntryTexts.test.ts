import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

import { composeIncomingShareCaptureText } from '../extractShareEntryTexts';

function textPayload(value: string): ResolvedSharePayload {
  return {
    shareType: 'text',
    value,
    contentUri: null,
    contentType: 'text',
    contentMimeType: 'text/plain',
    originalName: null,
    contentSize: null,
  };
}

describe('composeIncomingShareCaptureText', () => {
  it('returns one string for plain text', () => {
    expect(composeIncomingShareCaptureText([textPayload('  hello  ')], [])).toBe('hello');
  });

  it('puts body before URL when both are present', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'https://example.com/path',
        contentUri: null,
        contentMimeType: null,
        originalName: null,
        contentSize: null,
      } as unknown as ResolvedSharePayload,
      textPayload('My note'),
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('My note\n\nhttps://example.com/path');
  });

  it('merges title (originalName), body, and URL without duplicating the link', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'Great read',
        contentUri: 'https://blog.example/post',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: 'Article title',
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe(
      'Article title\n\nGreat read\n\nhttps://blog.example/post'
    );
  });

  it('dedupes identical value and contentUri', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'https://same.io/x',
        contentUri: 'https://same.io/x',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://same.io/x');
  });

  it('drops originalName when it only repeats the URL path segment', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: '',
        contentUri: 'https://ex.com/docs/page',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: 'page',
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://ex.com/docs/page');
  });

  it('drops Safari-style originalName when path has no .html but name is Title.html', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: '',
        contentUri: 'https://en.wikipedia.org/wiki/The_Secret_Agent_(2025_film)',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: 'The_Secret_Agent_(2025_film).html',
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe(
      'https://en.wikipedia.org/wiki/The_Secret_Agent_(2025_film)'
    );
  });

  it('uses contentUri when value is empty (website)', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: '',
        contentUri: 'https://resolved.example/',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://resolved.example/');
  });

  it('skips images and still captures text from the same batch', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'image',
        value: 'file:///tmp/x.png',
        contentUri: 'file:///tmp/x.png',
        contentType: 'image',
        contentMimeType: 'image/png',
        originalName: 'x.png',
        contentSize: 10,
      } as ResolvedSharePayload,
      textPayload('keep'),
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('keep');
  });

  it('falls back to raw payloads when resolved yields nothing', () => {
    const raw: SharePayload[] = [
      { shareType: 'text', value: 'a' },
      { shareType: 'url', value: 'https://x.test' },
    ];
    expect(composeIncomingShareCaptureText([], raw)).toBe('a\n\nhttps://x.test');
  });

  it('collapses markdown link with bogus www.*.html label to a single URL', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: '[www.warp.dev.html](http://www.warp.dev.html)',
        contentUri: null,
        contentMimeType: 'text/html',
        contentType: 'website',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('http://www.warp.dev.html');
  });

  it('drops bare hostname when the same site URL is present', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'warp.dev',
        contentUri: 'https://warp.dev/learn',
        contentMimeType: null,
        contentType: 'website',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://warp.dev/learn');
  });

  it('drops www.*.html when it appears as value (not only originalName)', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'www.warp.dev.html',
        contentUri: 'https://www.warp.dev/',
        contentMimeType: 'text/html',
        contentType: 'website',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://www.warp.dev/');
  });

  it('drops domain.tld.html value (e.g. cmux.com.html)', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'cmux.com.html',
        contentUri: 'https://cmux.com/',
        contentMimeType: 'text/html',
        contentType: 'website',
        originalName: null,
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://cmux.com/');
  });

  it('skips www.*.html originalName and dedupes overlapping URL fields', () => {
    const resolved: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: 'https://warp.dev/',
        contentUri: 'https://warp.dev/',
        contentMimeType: 'text/html',
        contentType: 'website',
        originalName: 'www.warp.dev.html',
        contentSize: null,
      } as ResolvedSharePayload,
    ];
    expect(composeIncomingShareCaptureText(resolved, [])).toBe('https://warp.dev/');
  });

  it('returns null when nothing usable is shared', () => {
    expect(composeIncomingShareCaptureText([], [])).toBeNull();
    expect(
      composeIncomingShareCaptureText(
        [
          {
            shareType: 'image',
            value: 'x',
            contentUri: 'x',
            contentType: 'image',
            contentMimeType: 'image/png',
            originalName: null,
            contentSize: 1,
          } as ResolvedSharePayload,
        ],
        [{ shareType: 'image', value: 'y' }]
      )
    ).toBeNull();
  });
});
