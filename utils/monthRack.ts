import type { MonthKey } from '../types/temporal';
import { TEMPORAL_MONTH_RACK_ROW_HEIGHT } from '../constants/temporalNavigation';

export type MonthRackRowVisual = {
  opacity: number;
  scale: number;
};

/** Scroll offset that places `index` in the rack center (with symmetric padding). */
export function monthRackScrollOffsetForIndex(
  index: number,
  rowHeight: number = TEMPORAL_MONTH_RACK_ROW_HEIGHT,
): number {
  return Math.max(0, index * rowHeight);
}

/** Nearest month index from rack scroll offset (center-weighted). */
export function monthRackIndexFromScrollOffset(
  offsetY: number,
  monthCount: number,
  rowHeight: number = TEMPORAL_MONTH_RACK_ROW_HEIGHT,
): number {
  if (monthCount <= 0) {
    return 0;
  }
  const raw = Math.round(offsetY / rowHeight);
  return Math.min(monthCount - 1, Math.max(0, raw));
}

export function findMonthIndex(monthKeys: readonly MonthKey[], monthKey: MonthKey): number {
  const idx = monthKeys.indexOf(monthKey);
  return idx >= 0 ? idx : 0;
}

/**
 * Opacity / scale by distance from the active row (0 = center).
 * Calm falloff — not a scrollbar thumb.
 */
export function monthRackRowVisual(delta: number, reduceMotion: boolean): MonthRackRowVisual {
  if (reduceMotion) {
    return { opacity: delta === 0 ? 1 : 0.55, scale: 1 };
  }
  const abs = Math.abs(delta);
  if (abs === 0) {
    return { opacity: 1, scale: 1.04 };
  }
  if (abs === 1) {
    return { opacity: 0.58, scale: 1 };
  }
  if (abs === 2) {
    return { opacity: 0.38, scale: 0.98 };
  }
  return { opacity: 0.22, scale: 0.96 };
}
