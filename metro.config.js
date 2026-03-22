const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').ExpoMetroConfig} */
const config = getDefaultConfig(__dirname);

// Webfonts loaded via `require()` for expo-font (default Metro asset list is image-first)
if (!config.resolver.assetExts.includes('woff')) {
  config.resolver.assetExts.push('woff');
}
if (!config.resolver.assetExts.includes('woff2')) {
  config.resolver.assetExts.push('woff2');
}

module.exports = config;
