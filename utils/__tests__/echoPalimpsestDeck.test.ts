import {
  advancePalimpsestTopIndex,
  palimpsestStackIndices,
} from '../echoPalimpsestDeck';

describe('echoPalimpsestDeck', () => {
  it('advancePalimpsestTopIndex wraps', () => {
    expect(advancePalimpsestTopIndex(0, 3)).toBe(1);
    expect(advancePalimpsestTopIndex(2, 3)).toBe(0);
  });

  it('palimpsestStackIndices orders back to front', () => {
    expect(palimpsestStackIndices(3, 0)).toEqual([2, 1, 0]);
    expect(palimpsestStackIndices(3, 1)).toEqual([0, 2, 1]);
    expect(palimpsestStackIndices(2, 0)).toEqual([1, 0]);
  });
});
