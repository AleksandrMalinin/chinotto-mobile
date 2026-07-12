import {
  mayAttemptMobileResurface,
  shouldInvokeMobileResurface,
} from '../mobileResurfaceGuards';

const baseGuards = {
  captureReady: true,
  readSheetOpen: false,
  searchActive: false,
  composerHasDraft: false,
  voiceCaptureActive: false,
  streamEmpty: false,
  triedResurface: false,
};

describe('mayAttemptMobileResurface', () => {
  it('allows resurface on a clear capture home', () => {
    expect(mayAttemptMobileResurface(baseGuards)).toBe(true);
  });

  it('blocks while splash handoff is pending', () => {
    expect(mayAttemptMobileResurface({ ...baseGuards, captureReady: false })).toBe(false);
  });

  it('blocks while read sheet, search, draft, or voice are active', () => {
    expect(mayAttemptMobileResurface({ ...baseGuards, readSheetOpen: true })).toBe(false);
    expect(mayAttemptMobileResurface({ ...baseGuards, searchActive: true })).toBe(false);
    expect(mayAttemptMobileResurface({ ...baseGuards, composerHasDraft: true })).toBe(false);
    expect(mayAttemptMobileResurface({ ...baseGuards, voiceCaptureActive: true })).toBe(false);
  });

  it('blocks on empty stream and after an open attempt', () => {
    expect(mayAttemptMobileResurface({ ...baseGuards, streamEmpty: true })).toBe(false);
    expect(mayAttemptMobileResurface({ ...baseGuards, triedResurface: true })).toBe(false);
  });
});

describe('shouldInvokeMobileResurface', () => {
  it('allows one backend invoke per session', () => {
    expect(shouldInvokeMobileResurface(false, false)).toBe(true);
    expect(shouldInvokeMobileResurface(true, false)).toBe(false);
    expect(shouldInvokeMobileResurface(false, true)).toBe(false);
  });
});
