import { isHomeDepthRecallVisible, pickHomeDepthRecallCandidate } from '../homeDepthRecallVisibility';

const base = {
  active: true,
  searchActive: false,
  readSheetOpen: false,
  streamEmpty: false,
  composerHasDraft: false,
  voiceCaptureActive: false,
  totalEntryCount: 12,
  candidate: { id: 'old' },
  streamEntryIds: ['newest', 'mid', 'old-in-list'],
};

describe('isHomeDepthRecallVisible', () => {
  it('shows when candidate is not in recent stream window', () => {
    expect(isHomeDepthRecallVisible(base)).toBe(true);
  });

  it('hides when candidate already appears in recent stream', () => {
    expect(
      isHomeDepthRecallVisible({
        ...base,
        streamEntryIds: ['newest', 'old', 'other'],
      }),
    ).toBe(false);
  });

  it('hides during search, sheet, capture draft, or empty stream', () => {
    expect(isHomeDepthRecallVisible({ ...base, searchActive: true })).toBe(false);
    expect(isHomeDepthRecallVisible({ ...base, readSheetOpen: true })).toBe(false);
    expect(isHomeDepthRecallVisible({ ...base, composerHasDraft: true })).toBe(false);
    expect(isHomeDepthRecallVisible({ ...base, voiceCaptureActive: true })).toBe(false);
    expect(isHomeDepthRecallVisible({ ...base, streamEmpty: true })).toBe(false);
  });
});

describe('pickHomeDepthRecallCandidate', () => {
  it('skips candidates already in the recent stream window', () => {
    const picked = pickHomeDepthRecallCandidate(
      [
        { id: 'newest' },
        { id: 'older' },
      ],
      ['newest', 'mid', 'tail'],
    );
    expect(picked?.id).toBe('older');
  });
});
