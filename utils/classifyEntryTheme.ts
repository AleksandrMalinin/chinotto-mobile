import { SYSTEM_THEME_LINKS } from './entryThemes';

export type ThemeClassification = {
  themeId: string;
  confidence: number;
  source: string;
};

const TRAILING_URL_PUNCT = /[.,;:!?)]+$/;

/** Matches desktop `themes::has_url` — http(s) or bare www. token. */
export function hasUrlForThemeClassify(text: string): boolean {
  if (text.includes('http://') || text.includes('https://')) {
    return true;
  }
  return text.split(/\s+/).some((word) => {
    const trimmed = word.replace(TRAILING_URL_PUNCT, '');
    return trimmed.startsWith('www.') && trimmed.length > 4;
  });
}

/** Automatic theme assignment: URL entries → links only. User themes are manual in detail. */
export function classifyEntryTheme(text: string): ThemeClassification | null {
  if (hasUrlForThemeClassify(text)) {
    return {
      themeId: SYSTEM_THEME_LINKS,
      confidence: 1,
      source: 'url',
    };
  }
  return null;
}
