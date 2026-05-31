import type { EdgeInsets } from 'react-native-safe-area-context';

/** Full-height sheet when the user swipes up to continue a thought. */
export function thoughtSheetExpandedHeight(windowHeight: number, insets: EdgeInsets): number {
  return Math.min(Math.round(windowHeight * 0.92), windowHeight - insets.top - 24);
}

/** Scroll cap in compact (content-sized) read mode — matches original EntryReadSheet. */
export function thoughtSheetCompactScrollMaxHeight(
  windowHeight: number,
  comfortableReading: boolean
): number {
  return Math.min(
    windowHeight * (comfortableReading ? 0.62 : 0.58),
    comfortableReading ? 560 : 520
  );
}

export function shouldExpandThoughtSheet(dy: number, vy: number): boolean {
  return dy < -22 || vy < -450;
}

export function shouldDismissThoughtSheet(dy: number, vy: number): boolean {
  return dy > 22 || vy > 450;
}

export function shouldCollapseExpandedThoughtSheet(dy: number, vy: number): boolean {
  return dy > 28 || vy > 400;
}

/**
 * Dismiss straight from the expanded sheet — only on a long or fast downward
 * gesture. A normal downward swipe collapses to compact first (handled by
 * {@link shouldCollapseExpandedThoughtSheet}), so collapse stays reachable
 * instead of being shadowed by the smaller compact-dismiss threshold.
 */
export function shouldDismissExpandedThoughtSheet(dy: number, vy: number): boolean {
  return dy > 140 || vy > 1200;
}

export type ThoughtSheetOpenAnchor = {
  pageY: number;
  height: number;
};

export const SHEET_ENTER_OFFSET_DEFAULT = 28;

/** Estimated compact chrome (grabber + meta + padding) for anchor math before layout. */
export const SHEET_COMPACT_CHROME_ESTIMATE = 160;

/**
 * Initial translateY for a bottom-aligned sheet before it springs to rest.
 * Negative values lift the sheet toward a tapped row; small positive values give a subtle rise.
 */
export function thoughtSheetEnterOffsetFromAnchor(
  anchor: ThoughtSheetOpenAnchor | null | undefined,
  windowHeight: number,
  insets: EdgeInsets,
  estimatedCompactSheetHeight = SHEET_COMPACT_CHROME_ESTIMATE
): number {
  if (anchor == null) {
    return SHEET_ENTER_OFFSET_DEFAULT;
  }
  const rowBottom = anchor.pageY + anchor.height;
  const restingSheetTop = windowHeight - insets.bottom - estimatedCompactSheetHeight;
  const startTranslateY = rowBottom - restingSheetTop;
  const minLift = -Math.round(windowHeight * 0.72);
  return Math.max(minLift, Math.min(startTranslateY, SHEET_ENTER_OFFSET_DEFAULT));
}
