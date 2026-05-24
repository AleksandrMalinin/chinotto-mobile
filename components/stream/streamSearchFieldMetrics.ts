import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const STREAM_SEARCH_FONT_SIZE = 13;
export const STREAM_SEARCH_LINE_HEIGHT = 20;
export const STREAM_SEARCH_ROW_HEIGHT = 44;
const LETTER_SPACING = 0.15;

/** Vertically centers a 20px text band in the 44px capsule row. */
export const STREAM_SEARCH_SLOT_TOP =
  (STREAM_SEARCH_ROW_HEIGHT - STREAM_SEARCH_LINE_HEIGHT) / 2;

const sharedTypography: TextStyle = {
  fontSize: STREAM_SEARCH_FONT_SIZE,
  lineHeight: STREAM_SEARCH_LINE_HEIGHT,
  letterSpacing: LETTER_SPACING,
};

export function streamSearchDisplayTextStyle(): TextStyle {
  return sharedTypography;
}

/**
 * iOS: Open Sauce in `TextInput` draws low and clips — show `Text` in a fixed band,
 * native field is transparent (caret + editing only).
 */
export function streamSearchDisplayBandStyle(): ViewStyle {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STREAM_SEARCH_SLOT_TOP,
    height: STREAM_SEARCH_LINE_HEIGHT,
    justifyContent: 'center',
    overflow: 'visible',
  };
}

export function streamSearchInputStyle(): TextStyle {
  if (Platform.OS === 'ios') {
    return {
      ...sharedTypography,
      position: 'absolute',
      left: 0,
      right: 0,
      top: STREAM_SEARCH_SLOT_TOP,
      width: '100%',
      height: STREAM_SEARCH_LINE_HEIGHT,
      padding: 0,
      margin: 0,
      color: 'transparent',
    };
  }

  return {
    ...sharedTypography,
    flex: 1,
    width: '100%',
    height: STREAM_SEARCH_ROW_HEIGHT,
    paddingVertical: STREAM_SEARCH_SLOT_TOP,
    paddingHorizontal: 0,
    paddingRight: 4,
    margin: 0,
    minWidth: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  };
}

/** Android empty state — flex-centered placeholder. */
export function streamSearchPlaceholderMaskStyle(): ViewStyle {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingVertical: STREAM_SEARCH_SLOT_TOP,
  };
}
