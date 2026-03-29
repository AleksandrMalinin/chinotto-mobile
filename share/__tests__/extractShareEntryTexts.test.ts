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
