/**
 * Rasterize Chinotto SVGs to PNGs for Expo (icon, splash, Android adaptive).
 * Run: pnpm run generate:icons
 *
 * Splash: `chinotto-splash-logo.svg` uses the same viewBox as `ChinottoLogo` (64×64) so the
 * raster matches the JS logo at the same pt size. Shell color is `splash.backgroundColor`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

await rasterize('assets/chinotto-icon.svg', 'assets/icon.png', 1024);
await writeNativeSplashPng();
await rasterize('assets/chinotto-icon-foreground.svg', 'assets/android-icon-foreground.png', 1024);
await rasterize('assets/chinotto-icon-monochrome.svg', 'assets/android-icon-monochrome.png', 1024);
await rasterize('assets/chinotto-icon.svg', 'assets/favicon.png', 48);

console.log('Done.');
