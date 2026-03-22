/**
 * Rasterize Chinotto SVGs to PNGs for Expo (icon, splash, Android adaptive).
 * Run: pnpm run generate:icons
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

await rasterize('assets/chinotto-icon.svg', 'assets/icon.png', 1024);
await rasterize('assets/chinotto-icon.svg', 'assets/splash-icon.png', 1024);
await rasterize('assets/chinotto-icon-foreground.svg', 'assets/android-icon-foreground.png', 1024);
await rasterize('assets/chinotto-icon-monochrome.svg', 'assets/android-icon-monochrome.png', 1024);
await rasterize('assets/chinotto-icon.svg', 'assets/favicon.png', 48);

console.log('Done.');
