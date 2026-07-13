import { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, useWindowDimensions } from 'react-native';

import { captureInputPaddingBottom, captureInputPaddingTop, useAppTheme } from '../theme';

export type CaptureInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  minHeight: number;
  /** When omitted, caps growth for a large composer (~45% window, max 340). */
  maxHeight?: number;
  placeholder?: string;
  placeholderTextColor?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Default true; set false while a full-screen overlay (e.g. brand splash) is visible. */
  autoFocus?: boolean;
  editable?: boolean;
  showSoftInputOnFocus?: boolean;
};

export const CaptureInput = forwardRef<TextInput, CaptureInputProps>(
  function CaptureInput(
    {
      value,
      onChangeText,
      onSubmit,
      minHeight,
      maxHeight: maxHeightProp,
      placeholder,
      placeholderTextColor,
      onFocus,
      onBlur,
      autoFocus = true,
      editable = true,
      showSoftInputOnFocus = true,
    },
    ref
  ) {
    const t = useAppTheme();
    const { height: windowHeight } = useWindowDimensions();
    const maxHeight =
      maxHeightProp ?? Math.min(windowHeight * 0.45, 340);

    const { colors, typography } = t;
    const isEmpty = value.length === 0;
    const typeStyle = isEmpty ? typography.captureHero : typography.capture;
    const resolvedPlaceholderColor =
      placeholderTextColor ??
      (isEmpty ? colors.captureInvitation : colors.capturePlaceholder);

    return (
      <TextInput
        testID="capture-input"
        ref={ref}
        style={[
          styles.field,
          {
            color: colors.fg,
            minHeight,
            maxHeight,
            fontFamily: typeStyle.fontFamily,
            fontSize: typeStyle.fontSize,
            letterSpacing: typeStyle.letterSpacing,
            lineHeight: typeStyle.lineHeight,
            paddingHorizontal: 0,
            paddingTop: captureInputPaddingTop,
            paddingBottom: captureInputPaddingBottom,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={resolvedPlaceholderColor}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        autoFocus={autoFocus}
        editable={editable}
        showSoftInputOnFocus={showSoftInputOnFocus}
        autoCorrect
        autoCapitalize="sentences"
        returnKeyType="done"
        enterKeyHint="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={onSubmit}
        keyboardAppearance={t.isDark ? 'dark' : 'light'}
        textAlignVertical="top"
        scrollEnabled
        importantForAutofill="no"
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        underlineColorAndroid="transparent"
      />
    );
  }
);

const styles = StyleSheet.create({
  field: {
    width: '100%',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
