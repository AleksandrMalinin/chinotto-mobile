import { appIconIdFromNativeName, APP_ICON_VARIANTS, getAppIconVariant } from '../iconVariants';

describe('iconVariants', () => {
  it('keeps the same six selectable ids as desktop', () => {
    expect(APP_ICON_VARIANTS.map((v) => v.id)).toEqual([
      'default',
      'light',
      'violet',
      'cyan',
      'orange',
      'gradient',
    ]);
  });

  it('maps null native name to default', () => {
    expect(appIconIdFromNativeName(null)).toBe('default');
  });

  it('falls back to default for unknown ids', () => {
    expect(getAppIconVariant('default').name).toBe('Default');
    expect(appIconIdFromNativeName('UnknownIcon')).toBe('default');
  });
});
