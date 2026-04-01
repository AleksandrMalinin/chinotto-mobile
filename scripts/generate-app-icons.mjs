/**
 * Rasterize Chinotto SVGs to PNGs for Expo (icon, splash, Android adaptive).
 * Run: pnpm run generate:icons
 *
 * Splash: `chinotto-splash-logo.svg` uses the same viewBox as `ChinottoLogo` (64×64) so the
 * raster matches the JS logo at the same pt size. Shell color is `splash.backgroundColor`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_MARK_SCALE = 0.9;

const APP_ICON_VARIANTS = [
  {
    id: 'light',
    foreground: '#e4e4e9',
    iosBackground: '#0f0f14',
    androidBackground: '#0f0f14',
  },
  {
    id: 'violet',
    foreground: '#e4e4e9',
    iosBackground: '#7C3AED',
    androidBackground: '#7C3AED',
  },
  {
    id: 'cyan',
    foreground: '#0a0a0e',
    iosBackground: '#06B6D4',
    androidBackground: '#06B6D4',
  },
  {
    id: 'orange',
    foreground: '#0a0a0e',
    iosBackground: '#F97316',
    androidBackground: '#F97316',
  },
  {
    id: 'gradient',
    foreground: '#e4e4e9',
    iosBackground: '#2b395a',
    androidBackground: '#2a344f',
    gradientStops: ['#51618e', '#2b395a'],
  },
];

async function rasterize(svgRelativePath, pngRelativePath, size) {
  const svgPath = join(root, svgRelativePath);
  const outPath = join(root, pngRelativePath);
  const input = readFileSync(svgPath);
  await sharp(input).resize(size, size).png().toFile(outPath);
  console.log(`Wrote ${pngRelativePath} (${size}×${size})`);
}

async function writeNativeSplashPng() {
  const svgPath = join(root, 'assets/chinotto-splash-logo.svg');
  const outPath = join(root, 'assets/splash-icon.png');
  const input = readFileSync(svgPath);
  /** Square canvas; SVG viewBox matches BrandSplash vector so `contain` doesn’t overscale the mark. */
  await sharp(input)
    .resize(2048, 2048, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
  console.log('Wrote assets/splash-icon.png (2048×2048, logo on transparent for native splash)');
}

function iosIconSvg({ foreground, iosBackground, gradientStops }) {
  const bg = gradientStops
    ? `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${gradientStops[0]}" />
          <stop offset="100%" stop-color="${gradientStops[1]}" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" fill="url(#g)"/>
    `
    : `<rect width="80" height="80" fill="${iosBackground}"/>`;
  return `
<svg width="1024" height="1024" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <g transform="translate(40 40) scale(${ICON_MARK_SCALE}) translate(-40 -40)">
    <circle cx="40" cy="40" r="22" stroke="${foreground}" stroke-width="2" fill="none"/>
    <circle cx="40" cy="31" r="5" fill="${foreground}"/>
    <circle cx="32" cy="42" r="4" fill="${foreground}"/>
    <circle cx="48" cy="42" r="4" fill="${foreground}"/>
    <circle cx="40" cy="49" r="3" fill="${foreground}"/>
  </g>
</svg>
`;
}

function androidForegroundSvg({ foreground }) {
  return `
<svg width="1024" height="1024" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(40 40) scale(${ICON_MARK_SCALE}) translate(-40 -40)">
    <circle cx="40" cy="40" r="22" stroke="${foreground}" stroke-width="2" fill="none"/>
    <circle cx="40" cy="31" r="5" fill="${foreground}"/>
    <circle cx="32" cy="42" r="4" fill="${foreground}"/>
    <circle cx="48" cy="42" r="4" fill="${foreground}"/>
    <circle cx="40" cy="49" r="3" fill="${foreground}"/>
  </g>
</svg>
`;
}

async function generateAlternateIcons() {
  const baseDir = join(root, 'assets', 'app-icons');
  for (const variant of APP_ICON_VARIANTS) {
    const dir = join(baseDir, variant.id);
    mkdirSync(dir, { recursive: true });

    const iosSvg = Buffer.from(
      iosIconSvg({
        foreground: variant.foreground,
        iosBackground: variant.iosBackground,
        gradientStops: variant.gradientStops,
      })
    );
    const androidSvg = Buffer.from(androidForegroundSvg({ foreground: variant.foreground }));

    await sharp(iosSvg).resize(1024, 1024).png().toFile(join(dir, 'ios.png'));
    await sharp(androidSvg).resize(1024, 1024).png().toFile(join(dir, 'android-foreground.png'));
    console.log(`Wrote assets/app-icons/${variant.id}/ios.png`);
    console.log(`Wrote assets/app-icons/${variant.id}/android-foreground.png`);
  }
}

async function writeIosAlternateAppIconSets() {
  const xcassetsDir = join(root, 'ios', 'Chinotto', 'Images.xcassets');
  const iconSlots = [
    { filename: 'icon-60@2x.png', size: 120, idiom: 'iphone', scale: '2x', pointSize: '60x60' },
    { filename: 'icon-60@3x.png', size: 180, idiom: 'iphone', scale: '3x', pointSize: '60x60' },
    { filename: 'icon-76@2x.png', size: 152, idiom: 'ipad', scale: '2x', pointSize: '76x76' },
    { filename: 'icon-83.5@2x.png', size: 167, idiom: 'ipad', scale: '2x', pointSize: '83.5x83.5' },
    { filename: 'icon-1024@1x.png', size: 1024, idiom: 'ios-marketing', scale: '1x', pointSize: '1024x1024' },
  ];

  const writeIconSet = async (setDir, svgBuffer) => {
    mkdirSync(setDir, { recursive: true });
    for (const slot of iconSlots) {
      await sharp(svgBuffer).resize(slot.size, slot.size).png().toFile(join(setDir, slot.filename));
    }
    writeFileSync(
      join(setDir, 'Contents.json'),
      JSON.stringify(
        {
          images: iconSlots.map((slot) => ({
            size: slot.pointSize,
            idiom: slot.idiom,
            filename: slot.filename,
            scale: slot.scale,
          })),
          info: {
            version: 1,
            author: 'xcode',
          },
        },
        null,
        2
      )
    );
  };

  const defaultSvg = Buffer.from(
    iosIconSvg({
      foreground: '#8a94c8',
      iosBackground: '#0a0a0e',
    })
  );
  await writeIconSet(join(xcassetsDir, 'AppIcon.appiconset'), defaultSvg);
  console.log('Wrote ios/Chinotto/Images.xcassets/AppIcon.appiconset');

  for (const variant of APP_ICON_VARIANTS) {
    const setName = `${variant.id[0].toUpperCase()}${variant.id.slice(1)}AppIcon.appiconset`;
    const setDir = join(xcassetsDir, setName);

    const iosSvg = Buffer.from(
      iosIconSvg({
        foreground: variant.foreground,
        iosBackground: variant.iosBackground,
        gradientStops: variant.gradientStops,
      })
    );

    await writeIconSet(setDir, iosSvg);
    console.log(`Wrote ios/Chinotto/Images.xcassets/${setName}`);
  }
}

await rasterize('assets/chinotto-icon.svg', 'assets/icon.png', 1024);
await writeNativeSplashPng();
await rasterize('assets/chinotto-icon-foreground.svg', 'assets/android-icon-foreground.png', 1024);
await rasterize('assets/chinotto-icon-monochrome.svg', 'assets/android-icon-monochrome.png', 1024);
await rasterize('assets/chinotto-icon.svg', 'assets/favicon.png', 48);
await generateAlternateIcons();
await writeIosAlternateAppIconSets();

console.log('Done.');
