import {
  STREAM_LOAD_MORE_LOOKAHEAD_PX,
  STREAM_SCROLL_STATE_THROTTLE_MS,
  streamFocusOpacityDurationMs,
} from '../../constants/streamFocus';

describe('streamFocusOpacityDurationMs', () => {
  it('snaps during reduce motion or list mutation', () => {
    expect(streamFocusOpacityDurationMs(true, false)).toBe(0);
    expect(streamFocusOpacityDurationMs(false, true)).toBe(0);
  });

  it('cross-fades during steady scroll', () => {
    expect(streamFocusOpacityDurationMs(false, false)).toBe(280);
  });

  it('exposes pagination lookahead and scroll throttle constants', () => {
    expect(STREAM_SCROLL_STATE_THROTTLE_MS).toBeGreaterThan(0);
    expect(STREAM_LOAD_MORE_LOOKAHEAD_PX).toBeGreaterThan(160);
  });
});
