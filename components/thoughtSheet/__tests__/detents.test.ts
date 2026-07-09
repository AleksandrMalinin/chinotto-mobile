import {
  SHEET_ENTER_OFFSET_DEFAULT,
  shouldCollapseExpandedThoughtSheet,
  shouldDismissExpandedThoughtSheet,
  shouldDismissThoughtSheet,
  shouldExpandThoughtSheet,
  thoughtSheetCompactScrollMaxHeight,
  thoughtSheetExpandedHeight,
  thoughtSheetExpandedHeightWithKeyboard,
  thoughtSheetEnterOffsetFromAnchor,
} from '../detents';

const insets = { top: 47, left: 0, right: 0, bottom: 34 };

describe('thoughtSheet detents', () => {
  it('computes expanded height cap from window size', () => {
    expect(thoughtSheetExpandedHeight(844, insets)).toBe(Math.min(Math.round(844 * 0.92), 844 - 47 - 24));
  });

  it('shrinks expanded height when the keyboard is visible', () => {
    expect(thoughtSheetExpandedHeightWithKeyboard(844, insets, 0)).toBe(
      thoughtSheetExpandedHeight(844, insets),
    );
    expect(thoughtSheetExpandedHeightWithKeyboard(844, insets, 320)).toBeLessThan(
      thoughtSheetExpandedHeight(844, insets),
    );
  });

  it('uses content-aware scroll caps in compact mode', () => {
    expect(thoughtSheetCompactScrollMaxHeight(844, false)).toBe(Math.min(844 * 0.58, 520));
    expect(thoughtSheetCompactScrollMaxHeight(844, true)).toBe(Math.min(844 * 0.62, 560));
  });

  it('detects expand, collapse, and dismiss swipes', () => {
    expect(shouldExpandThoughtSheet(-25, 0)).toBe(true);
    expect(shouldDismissThoughtSheet(25, 0)).toBe(true);
    expect(shouldCollapseExpandedThoughtSheet(30, 0)).toBe(true);
    expect(shouldExpandThoughtSheet(-10, 0)).toBe(false);
  });

  it('expanded dismiss needs a long or fast downward gesture, not a normal swipe', () => {
    // A normal downward swipe collapses (reachable) — it must NOT dismiss.
    expect(shouldDismissExpandedThoughtSheet(10, 500)).toBe(false);
    expect(shouldDismissExpandedThoughtSheet(30, 0)).toBe(false);
    expect(shouldCollapseExpandedThoughtSheet(10, 500)).toBe(true);
    // Long drag or fast fling dismisses straight from expanded.
    expect(shouldDismissExpandedThoughtSheet(160, 0)).toBe(true);
    expect(shouldDismissExpandedThoughtSheet(10, 1300)).toBe(true);
  });

  it('derives enter offset from row anchor or falls back to default', () => {
    expect(thoughtSheetEnterOffsetFromAnchor(null, 844, insets)).toBe(SHEET_ENTER_OFFSET_DEFAULT);
    expect(thoughtSheetEnterOffsetFromAnchor(undefined, 844, insets)).toBe(SHEET_ENTER_OFFSET_DEFAULT);
    const restingTop = 844 - insets.bottom - 160;
    const anchor = { pageY: 520, height: 72 };
    const rowBottom = 520 + 72;
    expect(thoughtSheetEnterOffsetFromAnchor(anchor, 844, insets)).toBe(
      Math.max(-Math.round(844 * 0.72), Math.min(rowBottom - restingTop, SHEET_ENTER_OFFSET_DEFAULT))
    );
  });
});
