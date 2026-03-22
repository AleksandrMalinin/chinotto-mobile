import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo } from '../components/ChinottoLogo';
import { EnableSyncModal } from '../components/EnableSyncModal';
import { RecentList } from '../components/RecentList';
import type { Entry } from '../types/entry';
import { showDevMenu } from '../dev/showDevMenu';
import { deleteEntry, getRecentEntries, saveEntry } from '../storage/entryRepository';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

const RECENT_LIMIT = 20;
const SCROLL_REVEAL_OFFSET = 20;

/** Firebase session restore vs signed-out; avoids showing Enable sync before persistence restores. */
export type AuthRestorePhase = 'restoring' | 'signed_in' | 'signed_out';

export type CaptureScreenProps = {
  /** `__DEV__` only: long-press header logo opens dev menu (e.g. reset welcome). */
  onDevMenu?: () => void;
  /** Increment when Firestore ingest applies remote changes (desktop → mobile). */
  remoteIngestVersion?: number;
};

export function CaptureScreen({ onDevMenu, remoteIngestVersion = 0 }: CaptureScreenProps = {}) {
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
  }, [refreshEntries, remoteIngestVersion]);

  /** Optimistic UI: row disappears immediately; SQLite + tombstone outbox stay non-blocking. */
  const handleEntryDelete = useCallback((entry: Entry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    void deleteEntry(entry.id)
      .then(() => {
        void flushSyncTombstoneOutbox();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('deleteEntry failed', err);
        }
        void refreshEntries();
      });
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
          <View
            style={[
              styles.headerBar,
              {
                paddingHorizontal: gutter,
                paddingTop: t.spacing.xs,
                marginBottom: t.spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.headerLogoSlot,
                isFirebaseSyncConfigured() && Platform.OS === 'ios' && styles.headerReserveDevMenuTray,
              ]}
            >
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
              {isFirebaseSyncConfigured() && Platform.OS === 'ios' ? (
                <Pressable
                  testID="sync-header-cta"
                  accessibilityRole="button"
                  accessibilityLabel={
                    authRestorePhase === 'signed_in'
                      ? 'Sync, on'
                      : authRestorePhase === 'restoring'
                        ? 'Sync, checking sign-in'
                        : 'Sync, set up with Apple'
                  }
                  hitSlop={10}
                  onPress={() => setSyncModalVisible(true)}
                  style={({ pressed }) => [
                    styles.syncAfterLogo,
                    { opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <Text
                    style={{
                      color: t.colors.muted,
                      fontFamily: fonts.medium,
                      fontSize: 15,
                    }}
                  >
                    Sync
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <ScrollView
            style={styles.scrollFlex}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                flexGrow: 1,
                minHeight: windowHeight,
                paddingHorizontal: gutter,
              },
              needsScrollSpacer && { minHeight: windowHeight + 160 },
            ]}
          >
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
            <RecentList entries={entries} visible={showRecent} onEntryDelete={handleEntryDelete} />
            <View style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <EnableSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onEnabled={() => setAuthRestorePhase('signed_in')}
        authPhase={authRestorePhase}
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
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  headerLogoSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  /** When Sync is shown, keep the top-trailing corner clear for expo-dev-client’s floating menu. */
  headerReserveDevMenuTray: {
    paddingRight: 56,
  },
  syncAfterLogo: {
    marginLeft: 14,
    paddingVertical: 6,
    paddingRight: 4,
  },
  bottomFill: {},
});
