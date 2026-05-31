import {
  streamPullSearchDragEligibleAtStart,
  streamPullSearchProgress,
  streamPullSearchShouldCommitFromGesture,
} from '../streamPullToSearch';

describe('streamPullSearchProgress', () => {
  it('stays at 0 until the hint threshold', () => {
    expect(streamPullSearchProgress(0)).toBe(0);
    expect(streamPullSearchProgress(10)).toBe(0);
  });

  it('ramps toward 1 as pull increases', () => {
    expect(streamPullSearchProgress(30)).toBeGreaterThan(0);
    expect(streamPullSearchProgress(56)).toBe(1);
    expect(streamPullSearchProgress(80)).toBe(1);
  });
});

describe('streamPullSearchDragEligibleAtStart', () => {
  it('allows pull only when the drag begins at the top', () => {
    expect(streamPullSearchDragEligibleAtStart(0)).toBe(true);
    expect(streamPullSearchDragEligibleAtStart(12)).toBe(true);
    expect(streamPullSearchDragEligibleAtStart(13)).toBe(false);
    expect(streamPullSearchDragEligibleAtStart(240)).toBe(false);
  });
});

describe('streamPullSearchShouldCommitFromGesture', () => {
  it('commits only for eligible top drags that pass the pull threshold', () => {
    expect(
      streamPullSearchShouldCommitFromGesture({ dragEligible: false, maxPullPx: 80 }),
    ).toBe(false);
    expect(
      streamPullSearchShouldCommitFromGesture({ dragEligible: true, maxPullPx: 40 }),
    ).toBe(false);
    expect(
      streamPullSearchShouldCommitFromGesture({ dragEligible: true, maxPullPx: 52 }),
    ).toBe(true);
  });
});
