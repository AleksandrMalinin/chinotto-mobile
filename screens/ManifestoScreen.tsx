import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

type ManifestoScreenProps = {
  onClose: () => void;
};

const MANIFESTO_PARAGRAPHS = [
  'Thinking rarely starts structured.',
  'Most tools assume the opposite. They ask you to create a document, a folder, a workspace before you even know what the thought is.',
  'So you name things, you organize, you plan - and the thought slips away. Sometimes you do not write it down at all because the friction is too high.',
  'Chinotto is built for the moment the thought appears. You open it, capture it, and move on. No hierarchy to maintain. Just capture.',
  'Structure can come later, when the thought has had time to settle. Not before.',
];

export function ManifestoScreen({ onClose }: ManifestoScreenProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const headerLogoSize = 42;
  const gutter = screenContentGutter(0);
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0, 44);
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };

  return (
    <View testID="manifesto-screen" style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <SafeAreaView style={styles.safe} edges={['right', 'left']}>
          <View
            style={[
              styles.headerBar,
              {
                paddingHorizontal: gutter,
                paddingTop: topInset + t.spacing.xs,
                marginBottom: t.spacing.sm,
              },
            ]}
          >
            <View style={styles.headerLogoSlot}>
              <Pressable
                testID="manifesto-logo"
                accessibilityRole="button"
                accessibilityLabel="Chinotto"
                accessibilityHint="Back to settings"
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              >
                <ChinottoLogo size={headerLogoSize} color={t.colors.fgDim} style={headerLogoAlignStyle} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: gutter,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: t.colors.fg }]}>Philosophy</Text>
            <Text style={[styles.kicker, { color: t.colors.metaFg }]}>Capture first. Revisit later.</Text>

            <View style={styles.body}>
              {MANIFESTO_PARAGRAPHS.map((paragraph, idx) => (
                <Text
                  key={`${paragraph}-${idx}`}
                  style={[
                    styles.paragraph,
                    {
                      color: idx === 0 ? t.colors.fg : t.colors.fgDim,
                    },
                  ]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  safe: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  headerLogoSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 44,
  },
  title: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  kicker: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  body: {
    marginTop: 20,
    gap: 16,
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: 0.12,
  },
});
