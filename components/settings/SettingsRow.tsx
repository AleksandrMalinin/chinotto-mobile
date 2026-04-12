import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, useAppTheme } from '../../theme';

export type SettingsRowVariant = 'navigation' | 'switch' | 'destructive' | 'info' | 'choice';

type BaseRowProps = {
  label: string;
  description?: string;
  testID?: string;
  isLast?: boolean;
};

type NavigationRowProps = BaseRowProps & {
  variant: 'navigation';
  valueLabel?: string;
  onPress: () => void;
};

type SwitchRowProps = BaseRowProps & {
  variant: 'switch';
  value: boolean;
  onValueChange: (next: boolean) => void;
};

type DestructiveRowProps = BaseRowProps & {
  variant: 'destructive';
  onPress: () => void;
};

type InfoRowProps = BaseRowProps & {
  variant: 'info';
  valueLabel?: string;
};

type ChoiceRowProps = BaseRowProps & {
  variant: 'choice';
  selected: boolean;
  onPress: () => void;
};

export type SettingsRowProps =
  | NavigationRowProps
  | SwitchRowProps
  | DestructiveRowProps
  | InfoRowProps
  | ChoiceRowProps;

export function SettingsRow(props: SettingsRowProps) {
  const t = useAppTheme();
  const borderBottomWidth = props.isLast ? 0 : StyleSheet.hairlineWidth;
  const labelColor =
    props.variant === 'destructive' ? 'rgba(255, 146, 146, 0.95)' : t.colors.fg;

  const content = (
    <View style={styles.inner}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: labelColor }]}>{props.label}</Text>
        {props.description ? (
          <Text style={[styles.description, { color: t.colors.metaFg }]}>{props.description}</Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {props.variant === 'switch' ? (
          <Switch
            value={props.value}
            onValueChange={props.onValueChange}
            trackColor={{
              false: 'rgba(255,255,255,0.14)',
              true: 'rgba(138,148,200,0.62)',
            }}
            thumbColor={props.value ? 'rgba(232,236,255,0.98)' : 'rgba(245,245,250,0.92)'}
          />
        ) : null}
        {props.variant === 'choice' ? (
          <View
            style={styles.choiceIndicatorSlot}
            accessibilityLabel={props.selected ? 'Selected' : 'Not selected'}
          >
            {props.selected ? (
              <View style={[styles.choiceDotFilled, { backgroundColor: t.colors.metaFg }]} />
            ) : null}
          </View>
        ) : null}
        {(props.variant === 'navigation' || props.variant === 'info') && props.valueLabel ? (
          <Text style={[styles.valueLabel, { color: t.colors.metaFg }]}>{props.valueLabel}</Text>
        ) : null}
        {props.variant === 'navigation' ? (
          <Ionicons name="chevron-forward" size={16} color={t.colors.metaFg} />
        ) : null}
      </View>
    </View>
  );

  if (props.variant === 'navigation' || props.variant === 'destructive' || props.variant === 'choice') {
    return (
      <Pressable
        testID={props.testID}
        onPress={props.onPress}
        accessibilityRole="button"
        accessibilityState={props.variant === 'choice' ? { selected: props.selected } : undefined}
        style={({ pressed }) => [
          styles.row,
          styles.interactiveRow,
          {
            borderBottomWidth,
            borderBottomColor: t.colors.border,
            backgroundColor: pressed ? 'rgba(255,255,255,0.03)' : 'transparent',
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      testID={props.testID}
      style={[
        styles.row,
        {
          borderBottomWidth,
          borderBottomColor: t.colors.border,
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  interactiveRow: {
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  description: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  /** Same width as prior checkmark (~18) — stable row layout for single-choice rows. */
  choiceIndicatorSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Same token as navigation chevron (`metaFg`). */
  choiceDotFilled: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
