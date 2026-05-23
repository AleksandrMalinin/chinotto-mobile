import {
  SHEET_ENTER_OFFSET_DEFAULT,
  shouldCollapseExpandedThoughtSheet,
  shouldDismissThoughtSheet,
  shouldExpandThoughtSheet,
  thoughtSheetCompactScrollMaxHeight,
  thoughtSheetEnterOffsetFromAnchor,
  thoughtSheetExpandedHeight,
} from '../detents';

const insets = { top: 47, left: 0, right: 0, bottom: 34 };

describe('thoughtSheet detents', () => {
  it('computes expanded height cap from window size', () => {
    expect(thoughtSheetExpandedHeight(844, insets)).toBe(Math.min(Math.round(844 * 0.92), 844 - 47 - 24));
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
