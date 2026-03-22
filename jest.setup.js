// Shared Jest setup (e.g. matchers). Keep minimal per project policy.

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  const Swipeable = ({ children }) => children;
  return {
    GestureHandlerRootView: View,
    Swipeable,
    ScrollView,
  };
});

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }) => children,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: View,
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = (p) => React.createElement(View, p);
  return {
    __esModule: true,
    default: Mock,
    Circle: Mock,
    Path: Mock,
    Defs: Mock,
    G: Mock,
    LinearGradient: Mock,
    RadialGradient: Mock,
    Stop: Mock,
  };
});
