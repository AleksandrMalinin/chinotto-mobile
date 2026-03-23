// @ts-check
/** @type {import('expo/config').ConfigContext} */
module.exports = () => {
  const { expo } = require('./app.json');

  const includeExperimentalIosHomeWidget =
    process.env.EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET === '1' ||
    process.env.NODE_ENV !== 'production';

  const plugins = expo.plugins.filter((entry) => {
    const id = Array.isArray(entry) ? entry[0] : entry;
    if (id === 'expo-widgets' && !includeExperimentalIosHomeWidget) {
      return false;
    }
    return true;
  });

  return {
    expo: {
      ...expo,
      plugins,
    },
  };
};
