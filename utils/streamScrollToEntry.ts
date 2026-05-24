/** Screen-space box from `measureInWindow`. */
export type ScrollBox = {
  y: number;
};

/**
 * Content `scrollTo` Y so `row` aligns below the top of the scroll viewport.
 * Uses live scroll offset + window measurements (robust vs layout-only frames).
 */
export function streamScrollContentYForRow(
  streamScrollY: number,
  scrollViewport: ScrollBox,
  row: ScrollBox,
  alignBelowViewportTop = 24,
): number {
  return Math.max(0, streamScrollY + (row.y - scrollViewport.y) - alignBelowViewportTop);
}
