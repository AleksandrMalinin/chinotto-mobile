import {
  findActiveFlatIndex,
  findActiveFlatIndexFromWindowMeasurements,
  streamFocusBodyOpacityBelowActive,
  streamFocusTimeOpacityBelowActive,
} from '../streamFocusTier';

describe('streamFocusBodyOpacityBelowActive', () => {
  it('keeps delta 1–2 at normal non-newest baseline (dark), then ramps from delta 3', () => {
    const n1 = streamFocusBodyOpacityBelowActive(1, false, false);
    const n2 = streamFocusBodyOpacityBelowActive(2, false, false);
    const n3 = streamFocusBodyOpacityBelowActive(3, false, false);
    expect(n1).toBeCloseTo(0.84, 5);
    expect(n2).toBeCloseTo(0.84, 5);
    expect(n3).toBeLessThan(n2);
  });

  it('progressively dims for delta 3+', () => {
    const d3 = streamFocusBodyOpacityBelowActive(3, false, false);
    const d5 = streamFocusBodyOpacityBelowActive(5, false, false);
    expect(d5).toBeLessThan(d3);
  });
});

describe('streamFocusTimeOpacityBelowActive', () => {
  it('stays full for delta 1–2 then eases', () => {
    expect(streamFocusTimeOpacityBelowActive(1, false)).toBe(1);
    expect(streamFocusTimeOpacityBelowActive(2, false)).toBe(1);
    expect(streamFocusTimeOpacityBelowActive(4, false)).toBeLessThan(1);
  });
});

describe('findActiveFlatIndex', () => {
  const ids = ['a', 'b', 'c', 'd'] as const;
  const frames = new Map([
    ['a', { top: 0, height: 40 }],
    ['b', { top: 40, height: 40 }],
    ['c', { top: 80, height: 40 }],
    ['d', { top: 120, height: 40 }],
  ]);

  it('returns -1 when viewport height is 0', () => {
    expect(findActiveFlatIndex(ids, frames, 0, 0, 100)).toBe(-1);
  });

  it('picks the intersecting row with the smallest top (closest to viewport top)', () => {
    expect(findActiveFlatIndex(ids, frames, 10, 100, 0)).toBe(0);
    expect(findActiveFlatIndex(ids, frames, 45, 100, 0)).toBe(1);
  });

  it('accounts for list offset in scroll coordinates', () => {
    const listOffsetY = 200;
    expect(findActiveFlatIndex(ids, frames, 210, 100, listOffsetY)).toBe(0);
  });

  it('accounts for list content paddingTop — row positions are below inset', () => {
    // Narrow viewport [0, 18): without inset we wrongly treat row `a` as starting at y=0 in scroll space.
    expect(findActiveFlatIndex(ids, frames, 0, 18, 0, 0)).toBe(0);
    // With paddingTop 20, row `a` really starts at 20 — does not intersect [0, 18).
    expect(findActiveFlatIndex(ids, frames, 0, 18, 0, 20)).toBe(-1);
  });

  it('returns -1 when frames are missing for all ids', () => {
    expect(findActiveFlatIndex(ids, new Map(), 0, 500, 0)).toBe(-1);
  });
});

describe('findActiveFlatIndexFromWindowMeasurements', () => {
  const viewport = { x: 0, y: 100, width: 400, height: 500 };

  it('returns -1 when viewport height is 0', () => {
    expect(
      findActiveFlatIndexFromWindowMeasurements(
        { ...viewport, height: 0 },
        [{ flatIndex: 0, box: { x: 0, y: 120, width: 400, height: 40 } }],
      ),
    ).toBe(-1);
  });

  it('picks the intersecting row with the smallest screen Y (topmost)', () => {
    const rows = [
      { flatIndex: 0, box: { x: 0, y: 200, width: 400, height: 40 } },
      { flatIndex: 1, box: { x: 0, y: 240, width: 400, height: 40 } },
    ];
    expect(findActiveFlatIndexFromWindowMeasurements(viewport, rows)).toBe(0);
  });

  it('ignores rows with less than min visible height inside the viewport', () => {
    // Viewport bottom 600; row top 591 → only 9px visible.
    const rows = [{ flatIndex: 0, box: { x: 0, y: 591, width: 400, height: 40 } }];
    expect(findActiveFlatIndexFromWindowMeasurements(viewport, rows)).toBe(-1);
  });
});
