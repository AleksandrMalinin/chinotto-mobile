import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo } from '../components/ChinottoLogo';
import { EnableSyncModal } from '../components/EnableSyncModal';
import { RecentList } from '../components/RecentList';
import type { Entry } from '../types/entry';
import { showDevMenu } from '../dev/showDevMenu';
import { getRecentEntries, saveEntry } from '../storage/entryRepository';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

const RECENT_LIMIT = 20;
const SCROLL_REVEAL_OFFSET = 20;

/** Firebase session restore vs signed-out; avoids showing Enable sync before persistence restores. */
export type AuthRestorePhase = 'restoring' | 'signed_in' | 'signed_out';

export type CaptureScreenProps = {
  /** `__DEV__` only: long-press header logo opens dev menu (e.g. reset welcome). */
  onDevMenu?: () => void;
};

export function CaptureScreen({ onDevMenu }: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [revealByScroll, setRevealByScroll] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [authRestorePhase, setAuthRestorePhase] = useState<AuthRestorePhase>(() =>
    isFirebaseSyncConfigured() && Platform.OS === 'ios' ? 'restoring' : 'signed_out'
  );
  const inputRef = useRef<TextInput>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const t = useAppTheme();
  const gutter = screenContentGutter(windowWidth);

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

  useEffect(() => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
      return;
    }

    if (__DEV__) {
      console.log('[ChinottoAuth] launch: attaching auth listener', { platform: Platform.OS });
    }

    const auth = getOrInitAuth();

    if (__DEV__) {
      const u = auth.currentUser;
      console.log('[ChinottoAuth] auth init: immediate currentUser', {
        uid: u?.uid ?? null,
        isAnonymous: u?.isAnonymous ?? null,
        providerIds: u?.providerData?.map((p) => p.providerId) ?? [],
      });
    }

    return onAuthStateChanged(auth, (user) => {
      const syncEnabled = Boolean(user && !user.isAnonymous);
      const nextPhase: AuthRestorePhase = syncEnabled ? 'signed_in' : 'signed_out';

      if (__DEV__) {
        console.log('[ChinottoAuth] onAuthStateChanged', {
          uid: user?.uid ?? null,
          isAnonymous: user?.isAnonymous ?? null,
          providerIds: user?.providerData?.map((p) => p.providerId) ?? [],
        });
        console.log('[ChinottoAuth] sync UI decision', {
          phase: nextPhase,
          treatAsSyncEnabled: syncEnabled,
        });
      }

      setAuthRestorePhase(nextPhase);
    });
  }, []);

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

    void saveEntry(trimmed)
      .then(() => {
        setText('');
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        void refreshEntries();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('saveEntry failed', err);
        }
      });
  }, [text, refreshEntries]);

  /** Compact 1–2 lines; sits close to the stream below. */
  const composerMinHeight = 48;
  const composerMaxHeight = 80;

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
              {
                flexGrow: 1,
                minHeight: windowHeight,
                paddingTop: t.spacing.xs,
                paddingHorizontal: gutter,
              },
              needsScrollSpacer && { minHeight: windowHeight + 160 },
            ]}
          >
            <View style={[styles.brandRow, { marginBottom: t.spacing.sm }]}>
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
            <View>
              <CaptureInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                onSubmit={handleSubmit}
                minHeight={composerMinHeight}
                maxHeight={composerMaxHeight}
              />
            </View>
            <RecentList entries={entries} visible={showRecent} />
            {isFirebaseSyncConfigured() && Platform.OS === 'ios' && authRestorePhase === 'signed_out' ? (
              <Pressable
                testID="enable-sync-cta"
                accessibilityRole="button"
                accessibilityLabel="Enable sync"
                onPress={() => setSyncModalVisible(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start', marginTop: t.spacing.md }]}
              >
                <Text
                  style={{
                    color: t.colors.muted,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                  }}
                >
                  Enable sync
                </Text>
              </Pressable>
            ) : null}
            <View style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <EnableSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onEnabled={() => setAuthRestorePhase('signed_in')}
        fg={t.colors.fg}
        fgDim={t.colors.fgDim}
        muted={t.colors.muted}
        bgElevated={t.colors.bgElevated}
        border={t.colors.border}
      />
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
  bottomFill: {},
});
