import {
  streamEchoPagerHomeOffset,
  streamEchoPagerIndexFromOffset,
  streamEchoPagerRevealProgress,
} from '../StreamEchoPager';

describe('streamEchoPagerLayout', () => {
  it('stream home is trailing page offset', () => {
    expect(streamEchoPagerHomeOffset(390)).toBe(390);
  });

  it('maps offset to stream vs echo index', () => {
    expect(streamEchoPagerIndexFromOffset(390, 390)).toBe(0);
    expect(streamEchoPagerIndexFromOffset(250, 390)).toBe(0);
    expect(streamEchoPagerIndexFromOffset(100, 390)).toBe(1);
    expect(streamEchoPagerIndexFromOffset(0, 390)).toBe(1);
  });

  it('maps offset to echo reveal progress for ambient crossfade', () => {
    expect(streamEchoPagerRevealProgress(390, 390)).toBe(0);
    expect(streamEchoPagerRevealProgress(195, 390)).toBe(0.5);
    expect(streamEchoPagerRevealProgress(0, 390)).toBe(1);
  });
});
