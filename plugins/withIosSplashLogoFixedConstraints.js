/**
 * After expo-splash-screen builds SplashScreen.storyboard XML, the splash UIImageView only has
 * centerX/centerY. Without width/height, Auto Layout can relayout when the bitmap loads (intrinsic
 * size), so the logo briefly grows or jumps. This plugin adds fixed width/height matching
 * `imageWidth` from the splash plugin.
 *
 * Plugin order: list this plugin **before** `expo-splash-screen` in app.json so the
 * splashScreenStoryboard mod chain runs expo first (image + colors), then this (constraints).
 *
 * Keep `imageWidth` in sync with `constants/splashLogo.ts` (`SPLASH_LOGO_SIZE_PTS`) and
 * `expo-splash-screen` plugin `imageWidth` in app.json.
 */
function withIosSplashLogoFixedConstraints(config, props = {}) {
  const path = require('path');
  const imageWidth = props.imageWidth ?? 120;

  // pnpm does not hoist @expo/prebuild-config to the project root; resolve it from expo's graph.
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  const storyboardPluginPath = require.resolve(
    '@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withIosSplashScreenStoryboard',
    { paths: [expoRoot] }
  );
  const { withIosSplashScreenStoryboard } = require(storyboardPluginPath);

  return withIosSplashScreenStoryboard(config, (cfg) => {
    const xml = cfg.modResults;
    const mainView = xml?.document?.scenes?.[0]?.scene?.[0]?.objects?.[0]?.viewController?.[0]?.view?.[0];
    if (!mainView?.constraints?.[0]?.constraint) {
      return cfg;
    }
    const list = mainView.constraints[0].constraint;
    if (list.some((c) => c.$?.id === 'expo-splash-fixed-w')) {
      return cfg;
    }
    const w = String(imageWidth);
    list.push(
      {
        $: {
          firstItem: 'EXPO-SplashScreen',
          firstAttribute: 'width',
          constant: w,
          id: 'expo-splash-fixed-w',
        },
      },
      {
        $: {
          firstItem: 'EXPO-SplashScreen',
          firstAttribute: 'height',
          constant: w,
          id: 'expo-splash-fixed-h',
        },
      }
    );
    return cfg;
  });
}

module.exports = withIosSplashLogoFixedConstraints;
