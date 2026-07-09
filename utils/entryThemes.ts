/** Minimum confidence for theme recall (search chips and theme-only browse). */
export const THEME_RECALL_MIN_CONFIDENCE = 0.7;

/** Minimum themed entries before a search chip appears. */
export const THEME_CHIP_MIN_COUNT = 5;

/** Max user-defined recall themes (system "links" is separate). */
export const MAX_USER_THEMES = 7;

export const SYSTEM_THEME_LINKS = 'links';

/** Closed sheet trigger when no recall theme is assigned. */
export const ENTRY_THEME_ADD_LABEL = 'Add theme';

/** Picker chip to clear an assigned recall theme. */
export const ENTRY_THEME_CLEAR_LABEL = 'No theme';

export type UserTheme = {
  id: string;
  label: string;
  sortOrder: number;
};

export function themeLabel(themeId: string, userThemes: UserTheme[]): string {
  if (themeId === SYSTEM_THEME_LINKS) {
    return 'Links';
  }
  return userThemes.find((t) => t.id === themeId)?.label ?? themeId;
}

export function entryThemeTriggerLabel(
  themeId: string | null | undefined,
  userThemes: UserTheme[],
): string {
  if (themeId == null) {
    return ENTRY_THEME_ADD_LABEL;
  }
  return themeLabel(themeId, userThemes);
}

export function recallThemeOptions(userThemes: UserTheme[]): UserTheme[] {
  return [...userThemes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function searchChipThemes(userThemes: UserTheme[]): { id: string; label: string }[] {
  return [
    { id: SYSTEM_THEME_LINKS, label: 'Links' },
    ...recallThemeOptions(userThemes).map((t) => ({ id: t.id, label: t.label })),
  ];
}
