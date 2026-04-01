export type AppIconVariantId = 'default' | 'light' | 'violet' | 'cyan' | 'orange' | 'gradient';

export type AppIconVariant = {
  id: AppIconVariantId;
  name: string;
  /** Native plugin icon key (PascalCase), null means default app icon. */
  nativeName: string | null;
  foreground: string;
  /** iOS full icon background. */
  iosBackground: string;
  /** Android adaptive icon requires solid background color. */
  androidBackground: string;
  gradientStops?: [string, string];
};

/** Mirrors desktop selectable variants and naming. */
export const APP_ICON_VARIANTS: AppIconVariant[] = [
  {
    id: 'default',
    name: 'Default',
    nativeName: null,
    foreground: '#8a94c8',
    iosBackground: '#0a0a0e',
    androidBackground: '#0a0a0e',
  },
  {
    id: 'light',
    name: 'Light',
    nativeName: 'LightAppIcon',
    foreground: '#e4e4e9',
    iosBackground: '#0f0f14',
    androidBackground: '#0f0f14',
  },
  {
    id: 'violet',
    name: 'Violet',
    nativeName: 'VioletAppIcon',
    foreground: '#e4e4e9',
    iosBackground: '#7C3AED',
    androidBackground: '#7C3AED',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    nativeName: 'CyanAppIcon',
    foreground: '#0a0a0e',
    iosBackground: '#06B6D4',
    androidBackground: '#06B6D4',
  },
  {
    id: 'orange',
    name: 'Orange',
    nativeName: 'OrangeAppIcon',
    foreground: '#0a0a0e',
    iosBackground: '#F97316',
    androidBackground: '#F97316',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    nativeName: 'GradientAppIcon',
    foreground: '#e4e4e9',
    iosBackground: '#1d2437',
    androidBackground: '#2a344f',
    gradientStops: ['#51618e', '#2b395a'],
  },
];

const byId = new Map(APP_ICON_VARIANTS.map((variant) => [variant.id, variant]));
const byNativeName = new Map(
  APP_ICON_VARIANTS.map((variant) => [variant.nativeName ?? '__default__', variant.id])
);

export function getAppIconVariant(id: AppIconVariantId): AppIconVariant {
  return byId.get(id) ?? APP_ICON_VARIANTS[0];
}

export function appIconIdFromNativeName(name: string | null): AppIconVariantId {
  return byNativeName.get(name ?? '__default__') ?? 'default';
}
