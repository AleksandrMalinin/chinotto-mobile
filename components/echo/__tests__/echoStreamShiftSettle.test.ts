import { streamEchoPagerHomeOffset } from '../StreamEchoPager';

function settleOffsetX(x: number, homeX: number, vx: number): number {
  if (vx > 0.35) {
    return 0;
  }
  if (vx < -0.35) {
    return homeX;
  }
  return x < homeX * 0.5 ? 0 : homeX;
}

describe('echo stream shift settle', () => {
  const homeX = streamEchoPagerHomeOffset(390);

  it('swipe right velocity opens echo', () => {
    expect(settleOffsetX(homeX, homeX, 0.5)).toBe(0);
  });

  it('swipe left velocity returns to stream', () => {
    expect(settleOffsetX(0, homeX, -0.5)).toBe(homeX);
  });
});
