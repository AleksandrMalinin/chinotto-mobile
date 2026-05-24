import { Platform, StyleSheet } from 'react-native';

import type { MonthKey } from '../types/temporal';
import {
  TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS,
  TEMPORAL_MONTH_RACK_ROW_HEIGHT,
  TEMPORAL_MONTH_RACK_YEAR_HEIGHT,
} from '../constants/temporalNavigation';

export type MonthRackRowVisual = {
  opacity: number;
  scale: number;
};

/** How many month rows the expanded rack shows at once (caps with history depth). */
export function monthRackVisibleRowSlots(monthCount: number): number {
  if (monthCount <= 0) {
    return 0;
  }
  return Math.min(monthCount, TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS);
}

/** Scroll viewport height for the current month history depth. */
export function monthRackScrollViewportHeight(
  monthCount: number,
  rowHeight: number = TEMPORAL_MONTH_RACK_ROW_HEIGHT,
): number {
  return monthRackVisibleRowSlots(monthCount) * rowHeight;
}

/** True when month rows overflow the capped viewport — show edge fades. */
export function monthRackNeedsScrollFade(monthCount: number): boolean {
  return monthCount > TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS;
}

/** Leading-edge corner radius — never larger than half the plaque height. */
export function monthRackShellCornerRadius(bodyHeight: number): number {
  if (bodyHeight <= 0) {
    return 0;
  }
  return Math.min(14, Math.floor(bodyHeight / 2));
}

/** @deprecated Use {@link monthRackShellCornerRadius} with full body height. */
export function monthRackBorderRadius(
  scrollViewportHeight: number,
  yearHeight: number = TEMPORAL_MONTH_RACK_YEAR_HEIGHT,
): number {
  return monthRackShellCornerRadius(yearHeight + scrollViewportHeight);
}

/** Trailing-edge dock: rounded on the leading side only; flush on the right. */
function monthRackLeadingEdgeRadii(radius: number) {
  return {
    borderTopLeftRadius: radius,
    borderBottomLeftRadius: radius,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  };
}

/** Edge-docked plaque outline — padding ring on left/top/bottom; reliable leading corners on iOS. */
export function monthRackPlaqueOutline(
  bodyHeight: number,
  borderColor: string,
  borderWidth: number = Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
) {
  const outerRadius = monthRackShellCornerRadius(bodyHeight);
  const innerRadius = Math.max(0, outerRadius - borderWidth);
  const iosCurve = Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : null;
  return {
    borderWidth,
    outerRadius,
    innerRadius,
    outer: {
      ...monthRackLeadingEdgeRadii(outerRadius),
      backgroundColor: borderColor,
      paddingLeft: borderWidth,
      paddingTop: borderWidth,
      paddingBottom: borderWidth,
      paddingRight: 0,
      ...iosCurve,
    },
    inner: {
      ...monthRackLeadingEdgeRadii(innerRadius),
      overflow: 'hidden' as const,
      ...iosCurve,
    },
  };
}

/** @deprecated Use {@link monthRackPlaqueOutline}. */
export function monthRackEdgeShellStyle(bodyHeight: number, borderColor: string) {
  const outline = monthRackPlaqueOutline(bodyHeight, borderColor);
  return {
    ...outline.outer,
    ...outline.inner,
    borderWidth: outline.borderWidth,
    borderColor,
  };
}

/** Expanded rack height for a given month count. */
export function monthRackExpandedHeight(monthCount: number): number {
  return TEMPORAL_MONTH_RACK_YEAR_HEIGHT + monthRackScrollViewportHeight(monthCount);
}

/** @deprecated Use {@link monthRackEdgeShellStyle}. */
export function monthRackEdgeAttachRadii(leftRadius: number) {
  return {
    borderTopLeftRadius: leftRadius,
    borderBottomLeftRadius: leftRadius,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  };
}

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
    return { opacity: delta === 0 ? 1 : 0.5, scale: 1 };
  }
  const abs = Math.abs(delta);
  if (abs === 0) {
    return { opacity: 1, scale: 1 };
  }
  if (abs === 1) {
    return { opacity: 0.62, scale: 1 };
  }
  if (abs === 2) {
    return { opacity: 0.4, scale: 0.99 };
  }
  return { opacity: 0.24, scale: 0.98 };
}

/** Text color tier for rack month labels by distance from center. */
export function monthRackLabelColor(
  delta: number,
  chrome: { monthActive: string; monthNear: string; monthFar: string },
): string {
  if (delta === 0) {
    return chrome.monthActive;
  }
  if (Math.abs(delta) === 1) {
    return chrome.monthNear;
  }
  return chrome.monthFar;
}
