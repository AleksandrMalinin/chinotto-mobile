import { SYSTEM_THEME_LINKS } from './entryThemes';
import { extractHttpUrlsFromText } from './extractHttpUrlsFromText';

export type ThemeClassification = {
  themeId: string;
  confidence: number;
  source: string;
};

/** Automatic theme assignment: URL entries → links only. User themes are manual in detail. */
export function classifyEntryTheme(text: string): ThemeClassification | null {
  if (extractHttpUrlsFromText(text).length > 0) {
    return {
      themeId: SYSTEM_THEME_LINKS,
      confidence: 1,
      source: 'url',
    };
  }
  return null;
}
