const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').ExpoMetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpm installs real packages under node_modules/.pnpm and symlinks scopes like
// @react-native-firebase/* — Metro must follow symlinks or imports fail at bundle time.
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
};
const pnpmStore = path.join(projectRoot, 'node_modules', '.pnpm');
config.watchFolders = [...new Set([...(config.watchFolders ?? []), pnpmStore])];

// Webfonts loaded via `require()` for expo-font (default Metro asset list is image-first)
if (!config.resolver.assetExts.includes('woff')) {
  config.resolver.assetExts.push('woff');
}
if (!config.resolver.assetExts.includes('woff2')) {
  config.resolver.assetExts.push('woff2');
}

module.exports = config;
