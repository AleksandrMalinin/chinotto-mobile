import { resolveStreamLayoutInsets } from '../streamLayoutInsets';

describe('resolveStreamLayoutInsets', () => {
  it('keeps device insets at 1× layout scale', () => {
    expect(resolveStreamLayoutInsets(390, 390)).toEqual({
      streamGutter: 20,
      streamEntryInset: 32,
    });
  });

  it('scales insets when guide preview layout is wider than the device', () => {
    const insets = resolveStreamLayoutInsets(450, 390);
    expect(insets.streamGutter).toBeGreaterThan(20);
    expect(insets.streamEntryInset).toBeGreaterThan(32);
    expect(insets.streamEntryInset).toBe(insets.streamGutter + 14);
  });
});
