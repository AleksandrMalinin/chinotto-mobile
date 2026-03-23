import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

import {
  extractEntryTextsFromResolvedSharePayloads,
  extractEntryTextsFromSharePayloads,
} from '../extractShareEntryTexts';

describe('extractEntryTextsFromResolvedSharePayloads', () => {
  it('collects trimmed text shares', () => {
    const payloads: ResolvedSharePayload[] = [
      {
        shareType: 'text',
        value: '  hello  ',
        contentUri: null,
        contentType: 'text',
        contentMimeType: 'text/plain',
        originalName: null,
        contentSize: null,
      },
    ];
    expect(extractEntryTextsFromResolvedSharePayloads(payloads)).toEqual(['hello']);
  });

  it('collects URL shares', () => {
    const payloads = [
      {
        shareType: 'url' as const,
        value: 'https://example.com/path',
        contentUri: null,
        contentMimeType: null,
        originalName: null,
        contentSize: null,
      },
    ] as unknown as ResolvedSharePayload[];
    expect(extractEntryTextsFromResolvedSharePayloads(payloads)).toEqual(['https://example.com/path']);
  });

  it('uses contentUri for website when value is empty', () => {
    const payloads: ResolvedSharePayload[] = [
      {
        shareType: 'url',
        value: '',
        contentUri: 'https://resolved.example/',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: null,
        contentSize: null,
      },
    ];
    expect(extractEntryTextsFromResolvedSharePayloads(payloads)).toEqual(['https://resolved.example/']);
  });

  it('skips images and files', () => {
    const payloads: ResolvedSharePayload[] = [
      {
        shareType: 'image',
        value: 'file:///tmp/x.png',
        contentUri: 'file:///tmp/x.png',
        contentType: 'image',
        contentMimeType: 'image/png',
        originalName: 'x.png',
        contentSize: 10,
      },
      {
        shareType: 'text',
        value: 'keep',
        contentUri: null,
        contentType: 'text',
        contentMimeType: 'text/plain',
        originalName: null,
        contentSize: null,
      },
    ];
    expect(extractEntryTextsFromResolvedSharePayloads(payloads)).toEqual(['keep']);
  });
});

describe('extractEntryTextsFromSharePayloads', () => {
  it('maps text and url raw payloads', () => {
    const payloads: SharePayload[] = [
      { shareType: 'text', value: 'a' },
      { shareType: 'url', value: 'https://x.test' },
      { shareType: 'image', value: 'file:///y' },
    ];
    expect(extractEntryTextsFromSharePayloads(payloads)).toEqual(['a', 'https://x.test']);
  });
});
