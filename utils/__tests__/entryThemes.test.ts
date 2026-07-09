import { classifyEntryTheme } from '../classifyEntryTheme';
import {
  ENTRY_THEME_ADD_LABEL,
  entryThemeTriggerLabel,
  themeLabel,
} from '../entryThemes';

describe('entryThemes', () => {
  it('resolves user theme labels', () => {
    const themes = [{ id: 'book', label: 'Book', sortOrder: 1 }];
    expect(themeLabel('book', themes)).toBe('Book');
    expect(themeLabel('links', themes)).toBe('Links');
    expect(themeLabel('unknown', themes)).toBe('unknown');
  });

  it('uses Add theme when no theme is assigned', () => {
    const themes = [{ id: 'book', label: 'Book', sortOrder: 1 }];
    expect(entryThemeTriggerLabel(null, themes)).toBe(ENTRY_THEME_ADD_LABEL);
    expect(entryThemeTriggerLabel('book', themes)).toBe('Book');
  });
});

describe('classifyEntryTheme', () => {
  it('returns links when text contains http URL', () => {
    expect(classifyEntryTheme('see https://example.com/page')).toEqual({
      themeId: 'links',
      confidence: 1,
      source: 'url',
    });
  });

  it('returns links for bare www URL token', () => {
    expect(classifyEntryTheme('Check www.example.com/page')).toEqual({
      themeId: 'links',
      confidence: 1,
      source: 'url',
    });
  });

  it('returns null for plain text', () => {
    expect(classifyEntryTheme('just a thought')).toBeNull();
  });
});
