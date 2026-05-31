import { forwardRef, useMemo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInput as TextInputType,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { StreamSearchGlyph } from './stream/StreamSearchGlyph';
import { streamSearchChrome } from './stream/streamSearchChrome';
import {
  streamSearchDisplayBandStyle,
  streamSearchDisplayTextStyle,
  streamSearchInputStyle,
  streamSearchPlaceholderMaskStyle,
} from './stream/streamSearchFieldMetrics';
import { fonts, useAppTheme } from '../theme';

export type StreamSearchFieldProps = {
  expanded: boolean;
  focused: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onPressExpand: () => void;
  onPressClose: () => void;
  /** Sticky over stream — blur samples scrolling thoughts (iOS material). */
  glassSticky?: boolean;
  resultLabel?: string | null;
};

const SHELL_RADIUS = 20;
const BORDER_RING = 1;
const CAPSULE_ROW_HEIGHT = 44;
const SEARCH_PLACEHOLDER = 'Type a word or phrase…';
/** Fixed tap-target size for the collapsed search glyph; also the reserved slot width in the composer. */
export const STREAM_SEARCH_TOGGLE_TAP = 32;

/**
 * Quiet, on-demand search affordance. Lives beside the mic as a secondary-action cluster so search
 * reads as a supporting tool, not a standalone element floating in the layout. Expands the full
 * field via {@link onPress}.
 */
export function StreamSearchToggle({
  onPress,
  style,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAppTheme();
  return (
    <Pressable
      testID="stream-search-toggle"
      accessibilityLabel="Search thoughts"
      accessibilityRole="button"
      hitSlop={14}
      onPress={onPress}
      style={({ pressed }) => [styles.clusterToggle, style, pressed && styles.clusterTogglePressed]}
    >
      {/* Auxiliary to the mic: small, faint loupe so voice clearly leads the action cluster. */}
      <StreamSearchGlyph color={t.colors.muted} size={11} />
    </Pressable>
  );
}

type GlassCapsuleProps = {
  active: boolean;
  glassSticky: boolean;
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

function GlassCapsule({
  active,
  glassSticky,
  children,
  onPress,
  testID,
  accessibilityLabel,
}: GlassCapsuleProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => streamSearchChrome(t, active), [active, t]);
  const borderColors = active ? chrome.borderGradientActive : chrome.borderGradientIdle;

  const body = (
    <View style={[styles.capsuleOuter, active ? chrome.shadowActive : chrome.shadowIdle]}>
      <LinearGradient
        colors={[...borderColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderRing}
      >
        <View style={[styles.capsuleInner, { backgroundColor: chrome.innerFill }]}>
          {glassSticky && Platform.OS === 'ios' ? (
            <BlurView
              intensity={chrome.blurIntensity}
              tint={chrome.blurTint}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          {glassSticky && Platform.OS === 'android' ? (
            <BlurView
              intensity={chrome.blurIntensity}
              tint={chrome.blurTint}
              blurMethod="dimezisBlurViewSdk31Plus"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: chrome.veil }]}
          />
          <LinearGradient
            colors={[chrome.specularTop, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.specular}
            pointerEvents="none"
          />
          <View style={styles.contentRow}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );

  if (onPress == null) {
    return <View style={styles.host}>{body}</View>;
  }

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.host, pressed && styles.hostPressed]}
    >
      {body}
    </Pressable>
  );
}

export const StreamSearchField = forwardRef<TextInputType, StreamSearchFieldProps>(
  function StreamSearchField(
    {
      expanded,
      focused,
      value,
      onChangeText,
      onFocus,
      onBlur,
      onPressExpand,
      onPressClose,
      glassSticky = false,
      resultLabel,
    },
    ref,
  ) {
    const t = useAppTheme();
    const { colors, typography, spacing } = t;
    const { meta } = typography;

    const shellActive = expanded && (focused || value.length > 0);
    const glyphColor = shellActive || focused ? colors.metaFg : colors.muted;
    const displayTextStyle = useMemo(() => streamSearchDisplayTextStyle(), []);
    const displayBandStyle = useMemo(() => streamSearchDisplayBandStyle(), []);
    const inputStyle = useMemo(() => streamSearchInputStyle(), []);
    const placeholderMaskStyle = useMemo(() => streamSearchPlaceholderMaskStyle(), []);
    const isIosGhostInput = Platform.OS === 'ios';

    const closeFill = t.sunlightMode
      ? colors.accentSubtle
      : t.isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.07)';

    const expandedField = (
      <>
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            testID="stream-search-input"
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder=""
            accessibilityLabel="Search thoughts"
            accessibilityHint={SEARCH_PLACEHOLDER}
            multiline={false}
            style={[
              styles.input,
              inputStyle,
              {
                fontFamily: fonts.regular,
                color: isIosGhostInput ? 'transparent' : colors.fg,
              },
            ]}
            keyboardAppearance={t.isDark ? 'dark' : 'light'}
            returnKeyType="search"
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            autoCorrect={false}
            autoCapitalize="none"
            showSoftInputOnFocus
            scrollEnabled={false}
            underlineColorAndroid="transparent"
            {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
          />
          {isIosGhostInput ? (
            <View pointerEvents="none" style={displayBandStyle}>
              <Text
                testID={
                  value.length === 0 ? 'stream-search-placeholder' : 'stream-search-display'
                }
                numberOfLines={1}
                style={[
                  displayTextStyle,
                  {
                    color: value.length > 0 ? colors.fg : colors.searchPlaceholder,
                    fontFamily: fonts.regular,
                  },
                ]}
              >
                {value.length > 0 ? value : SEARCH_PLACEHOLDER}
              </Text>
            </View>
          ) : value.length === 0 ? (
            <View pointerEvents="none" style={placeholderMaskStyle}>
              <Text
                testID="stream-search-placeholder"
                numberOfLines={1}
                style={[
                  displayTextStyle,
                  {
                    color: colors.searchPlaceholder,
                    fontFamily: fonts.regular,
                  },
                ]}
              >
                {SEARCH_PLACEHOLDER}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          testID="stream-search-collapse"
          accessibilityLabel="Close search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPressClose}
          style={({ pressed }) => [
            styles.trailingControl,
            { backgroundColor: pressed ? closeFill : 'rgba(255,255,255,0.06)' },
          ]}
        >
          <Text style={[styles.closeGlyph, { color: colors.metaFg }]}>×</Text>
        </Pressable>
      </>
    );

    return (
      <View style={styles.wrap}>
        {expanded ? (
          <View style={styles.host}>
            <GlassCapsule active={shellActive} glassSticky={glassSticky}>
              <StreamSearchGlyph color={glyphColor} active={shellActive} />
              {expandedField}
            </GlassCapsule>
          </View>
        ) : (
          // Calm, on-demand: at rest search is just a quiet glyph (shared with the composer cluster).
          <View style={styles.collapsedRow}>
            <StreamSearchToggle onPress={onPressExpand} />
          </View>
        )}
        {expanded && resultLabel != null && resultLabel !== '' ? (
          <Text
            testID="stream-search-result-label"
            accessibilityRole="text"
            style={[
              styles.resultMeta,
              {
                color: colors.muted,
                fontFamily: meta.fontFamily,
                fontSize: 12,
                lineHeight: 16,
                letterSpacing: 0.25,
                marginTop: spacing.xs,
                paddingHorizontal: 6,
              },
            ]}
          >
            {resultLabel}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  host: {
    width: '100%',
  },
  hostPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  capsuleOuter: {
    width: '100%',
    borderRadius: SHELL_RADIUS + BORDER_RING,
  },
  borderRing: {
    borderRadius: SHELL_RADIUS + BORDER_RING,
    padding: BORDER_RING,
    overflow: 'hidden',
  },
  capsuleInner: {
    borderRadius: SHELL_RADIUS,
    minHeight: CAPSULE_ROW_HEIGHT,
    overflow: 'hidden',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    opacity: 0.85,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 8,
    minHeight: CAPSULE_ROW_HEIGHT,
    gap: 10,
  },
  /** At rest, search recedes to a quiet right-aligned glyph (revealed on demand). */
  collapsedRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  /** Quiet tap target; sits in the composer's trailing cluster beside the mic (auxiliary to it). */
  clusterToggle: {
    width: STREAM_SEARCH_TOGGLE_TAP,
    height: STREAM_SEARCH_TOGGLE_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.32,
  },
  clusterTogglePressed: {
    opacity: 0.6,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    height: CAPSULE_ROW_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'transparent',
  },
  trailingControl: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 22,
    lineHeight: 24,
    marginTop: -2,
    fontWeight: '300',
  },
  resultMeta: {},
});
