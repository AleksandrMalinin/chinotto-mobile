import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, useAppTheme } from '../../theme';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const t = useAppTheme();
  return (
    <View style={styles.block}>
      <Text
        style={[
          styles.title,
          {
            color: t.colors.sectionFg,
          },
        ]}
      >
        {title}
      </Text>
      <View
        style={[
          styles.surface,
          {
            borderColor: t.colors.border,
            backgroundColor: t.colors.accentSubtle,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 20,
  },
  title: {
    marginBottom: 8,
    marginLeft: 2,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
