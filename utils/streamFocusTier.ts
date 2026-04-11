/**
 * Stream focus: emphasis follows **list order**, not a fixed screen-space mask.
 *
 * 1. **Which row is active?** Only the scroll viewport is used to pick the **top-most
 *    meaningfully visible** entry (see `findActiveFlatIndex`). That index moves as the user
 *    scrolls so the “focus” travels with content.
 *
 * 2. **Highlight on scroll** — opacity (and sunlight body vs dim color for the active row) follows
 *    `flatIndex - activeFlatIndex`. **Typography size/weight** stays list-order: the newest entry
 *    remains the large row; the viewport only picks which row reads as “lit”.
 */

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Minimum visible height (px) for a row to count as “visible” for active selection. */
export const STREAM_FOCUS_MIN_VISIBLE_PX = 10;

/**
 * Body text opacity for rows **below** the active row (delta >= 1).
 * @param delta flatIndex - activeFlatIndex (0 = active; 1–2 = normal band; 3+ progressively dimmer)
 */
export function streamFocusBodyOpacityBelowActive(
  delta: number,
  sunlightMode: boolean,
  reduceMotion: boolean,
): number {
  if (delta < 1) {
    return sunlightMode ? 1 : 0.84;
  }
  // Next 1–2 items below active: same as normal non-newest (not tied to screen Y).
  if (delta <= 2) {
    return sunlightMode ? 1 : 0.84;
  }
  // delta >= 3: ramp (use delta-2 so the first dim step at delta=3 is visibly below normal)
  const t = smoothstep01((delta - 2) / 6);
  const startDark = 0.84;
  const endDark = reduceMotion ? 0.52 : 0.38;
  const startSun = 1;
  const endSun = reduceMotion ? 0.72 : 0.58;
  if (sunlightMode) {
    return startSun + (endSun - startSun) * t;
  }
  return startDark + (endDark - startDark) * t;
}

/** Timestamp opacity for rows below active (pairs with body). */
export function streamFocusTimeOpacityBelowActive(delta: number, reduceMotion: boolean): number {
  if (delta < 1) {
    return 1;
  }
  if (delta <= 2) {
    return 1;
  }
  const t = smoothstep01((delta - 2) / 6);
  const end = reduceMotion ? 0.62 : 0.48;
  return 1 + (end - 1) * t;
}

/**
 * Picks the **active** flat index: the visible thought whose top edge is closest to the top
 * of the scroll viewport (among rows that meaningfully intersect the viewport).
 * This is the only place scroll/viewport geometry is used; styling uses index distance from here.
 *
 * @param listContentInsetTop List `paddingTop`: row `onLayout` `y` is relative to the inner content box (below this inset).
 */
export function findActiveFlatIndex(
  orderedIds: readonly string[],
  frames: ReadonlyMap<string, { top: number; height: number }>,
  scrollY: number,
  viewportHeight: number,
  listOffsetY: number,
  listContentInsetTop = 0,
): number {
  if (orderedIds.length === 0 || viewportHeight <= 0) {
    return -1;
  }
  const viewportBottom = scrollY + viewportHeight;
  let bestIndex = -1;
  let bestTop = Infinity;
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const frame = frames.get(id);
    if (!frame || frame.height <= 0) {
      continue;
    }
    const topInScroll = listOffsetY + listContentInsetTop + frame.top;
    const bottomInScroll = topInScroll + frame.height;
    const intersectTop = Math.max(topInScroll, scrollY);
    const intersectBottom = Math.min(bottomInScroll, viewportBottom);
    const visibleH = intersectBottom - intersectTop;
    if (visibleH < STREAM_FOCUS_MIN_VISIBLE_PX) {
      continue;
    }
    const intersects = bottomInScroll > scrollY && topInScroll < viewportBottom;
    if (intersects && topInScroll < bestTop) {
      bestTop = topInScroll;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Window-space box from `measureInWindow` (screen coordinates). */
export type StreamFocusWindowBox = { x: number; y: number; width: number; height: number };

/**
 * Same rule as {@link findActiveFlatIndex}, but using **screen** boxes for the scroll viewport
 * and each row. Use when scroll-space math does not match what is actually visible (nested layout,
 * safe area, keyboard).
 */
export function findActiveFlatIndexFromWindowMeasurements(
  scrollViewportBox: StreamFocusWindowBox,
  entryMeasurements: ReadonlyArray<{ flatIndex: number; box: StreamFocusWindowBox | null }>,
  minVisiblePx = STREAM_FOCUS_MIN_VISIBLE_PX,
): number {
  if (scrollViewportBox.height <= 0) {
    return -1;
  }
  const vTop = scrollViewportBox.y;
  const vBottom = scrollViewportBox.y + scrollViewportBox.height;
  let bestIndex = -1;
  let bestTop = Infinity;
  for (const { flatIndex, box } of entryMeasurements) {
    if (!box || box.height <= 0) {
      continue;
    }
    const top = box.y;
    const bottom = box.y + box.height;
    if (bottom <= vTop || top >= vBottom) {
      continue;
    }
    const visibleH = Math.min(bottom, vBottom) - Math.max(top, vTop);
    if (visibleH < minVisiblePx) {
      continue;
    }
    if (top < bestTop) {
      bestTop = top;
      bestIndex = flatIndex;
    }
  }
  return bestIndex;
}
