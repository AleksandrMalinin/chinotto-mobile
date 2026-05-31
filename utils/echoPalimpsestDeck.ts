/** Rotate palimpsest deck — top index advances by one peel. */
export function advancePalimpsestTopIndex(topIndex: number, deckLength: number): number {
  if (deckLength <= 0) {
    return 0;
  }
  return (topIndex + 1) % deckLength;
}

/** Visible stack order back → front (last item is interactive top). */
export function palimpsestStackIndices(deckLength: number, topIndex: number): number[] {
  const n = Math.min(3, deckLength);
  if (n === 0) {
    return [];
  }
  const indices: number[] = [];
  for (let layer = n - 1; layer >= 0; layer -= 1) {
    indices.push((topIndex + layer) % deckLength);
  }
  return indices;
}
