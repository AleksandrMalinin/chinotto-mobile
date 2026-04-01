const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) {
    return defaultValue;
  }
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

/** Temporary kill switch while dynamic icon switching is unstable on iOS builds. */
export const ENABLE_APP_ICON_SWITCHER = envFlag(
  process.env.EXPO_PUBLIC_ENABLE_APP_ICON_SWITCHER,
  false
);
