import { forwardRef, useCallback, useState } from 'react';
import { Platform, StyleSheet, TextInput, useWindowDimensions } from 'react-native';

import { useAppTheme } from '../theme';

export type CaptureInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  minHeight: number;
};

export const CaptureInput = forwardRef<TextInput, CaptureInputProps>(
  function CaptureInput({ value, onChangeText, onSubmit, minHeight }, ref) {
    const t = useAppTheme();
    const { height: windowHeight } = useWindowDimensions();
    const maxHeight = Math.min(windowHeight * 0.45, 340);
    const [focused, setFocused] = useState(false);

    const onFocus = useCallback(() => setFocused(true), []);
    const onBlur = useCallback(() => setFocused(false), []);

    const { colors, typography } = t;
    const { capture } = typography;
    const underline = focused ? colors.borderFocus : colors.border;

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
            borderBottomColor: underline,
            fontFamily: capture.fontFamily,
            fontSize: capture.fontSize,
            letterSpacing: capture.letterSpacing,
            lineHeight: capture.lineHeight,
            paddingHorizontal: t.spacing.md,
            paddingTop: t.spacing.sm,
            paddingBottom: t.spacing.md,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        autoFocus
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
      />
    );
  }
);

const styles = StyleSheet.create({
  field: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
