import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo } from '../components/ChinottoLogo';
import { RecentList } from '../components/RecentList';
import type { Entry } from '../types/entry';
import { showDevMenu } from '../dev/showDevMenu';
import { getRecentEntries, saveEntry } from '../storage/entryRepository';
import { useAppTheme } from '../theme';

const RECENT_LIMIT = 20;
const SCROLL_REVEAL_OFFSET = 20;

export type CaptureScreenProps = {
  /** `__DEV__` only: long-press header logo opens dev menu (e.g. reset welcome). */
  onDevMenu?: () => void;
};

export function CaptureScreen({ onDevMenu }: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [revealByScroll, setRevealByScroll] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { height: windowHeight } = useWindowDimensions();
  const t = useAppTheme();

  const isInputEmpty = text.trim().length === 0;
  const showRecent = isInputEmpty || revealByScroll;
  const needsScrollSpacer = !isInputEmpty && !revealByScroll;

  const refreshEntries = useCallback(async () => {
    try {
      const next = await getRecentEntries(RECENT_LIMIT);
      setEntries(next);
    } catch (err) {
      if (__DEV__) {
        console.warn('getRecentEntries failed', err);
      }
    }
  }, []);

  useEffect(() => {
    void refreshEntries();
  }, [refreshEntries]);

  useEffect(() => {
    if (!isInputEmpty) {
      setRevealByScroll(false);
    }
  }, [isInputEmpty]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y > SCROLL_REVEAL_OFFSET) {
      setRevealByScroll(true);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setText('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    void saveEntry(trimmed)
      .then(() => refreshEntries())
      .catch((err) => {
        if (__DEV__) {
          console.warn('saveEntry failed', err);
        }
      });
  }, [text, refreshEntries]);

  const inputMinHeight = Math.max(160, windowHeight * 0.38);

  return (
    <View style={styles.shell}>
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={[
              styles.scrollContent,
              needsScrollSpacer && { minHeight: windowHeight + 160 },
              { paddingTop: t.spacing.xs },
            ]}
          >
            <View style={[styles.brandRow, { paddingHorizontal: t.spacing.md, marginBottom: t.spacing.xs }]}>
              {onDevMenu != null ? (
                <Pressable
                  accessibilityLabel="Chinotto"
                  accessibilityHint="Long press opens developer menu"
                  delayLongPress={450}
                  hitSlop={12}
                  onLongPress={() => showDevMenu({ onResetWelcome: onDevMenu })}
                >
                  <ChinottoLogo testID="header-logo" size={32} color={t.colors.fgDim} />
                </Pressable>
              ) : (
                <ChinottoLogo testID="header-logo" size={32} color={t.colors.fgDim} />
              )}
            </View>
            <CaptureInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onSubmit={handleSubmit}
              minHeight={inputMinHeight}
            />
            <RecentList entries={entries} visible={showRecent} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
});
