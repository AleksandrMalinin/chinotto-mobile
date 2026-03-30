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
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: ({ name, size, color, ...rest }) =>
      React.createElement(View, {
        ...rest,
        testID: `ionicon-${name}`,
        style: [{ width: size, height: size }, rest.style],
      }),
  };
});

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

jest.mock('react-native-purchases', () => {
  const emptyCustomerInfo = {
    entitlements: { active: {}, all: {} },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    nonSubscriptionTransactions: [],
    originalAppUserId: '',
    originalPurchaseDate: null,
    originalApplicationVersion: null,
    managementURL: null,
    firstSeen: '',
    requestDate: '',
    latestExpirationDate: null,
  };
  const INTRO_ELIGIBILITY_STATUS = {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  };
  const Purchases = {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    STOREKIT_VERSION: {
      STOREKIT_1: 'STOREKIT_1',
      STOREKIT_2: 'STOREKIT_2',
      DEFAULT: 'DEFAULT',
    },
    checkTrialOrIntroductoryPriceEligibility: jest.fn(() => Promise.resolve({})),
    getCustomerInfo: jest.fn(() => Promise.resolve(emptyCustomerInfo)),
    getOfferings: jest.fn(() => Promise.resolve({ current: null, all: {} })),
    purchasePackage: jest.fn(() =>
      Promise.resolve({
        customerInfo: emptyCustomerInfo,
        productIdentifier: 'monthly',
      })
    ),
    restorePurchases: jest.fn(() => Promise.resolve(emptyCustomerInfo)),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(() => true),
    LOG_LEVEL: {
      DEBUG: 'DEBUG',
      ERROR: 'ERROR',
      WARN: 'WARN',
      INFO: 'INFO',
      VERBOSE: 'VERBOSE',
    },
    PURCHASES_ERROR_CODE: {
      PURCHASE_CANCELLED_ERROR: '1',
    },
    PACKAGE_TYPE: {
      UNKNOWN: 'UNKNOWN',
      CUSTOM: 'CUSTOM',
      LIFETIME: 'LIFETIME',
      ANNUAL: 'ANNUAL',
      MONTHLY: 'MONTHLY',
      WEEKLY: 'WEEKLY',
      TWO_MONTH: 'TWO_MONTH',
      THREE_MONTH: 'THREE_MONTH',
      SIX_MONTH: 'SIX_MONTH',
    },
  };
  return {
    __esModule: true,
    default: Purchases,
    LOG_LEVEL: Purchases.LOG_LEVEL,
    INTRO_ELIGIBILITY_STATUS,
  };
});

jest.mock('react-native-purchases-ui', () => ({}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
    Soft: 3,
    Rigid: 4,
  },
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  createURL: jest.fn((path) => `chinotto:/${path}`),
  parse: jest.fn(),
}));

jest.mock('expo-widgets', () => ({
  createWidget: jest.fn(() => ({
    updateSnapshot: jest.fn(),
    reload: jest.fn(),
    updateTimeline: jest.fn(),
    getTimeline: jest.fn(() => Promise.resolve([])),
  })),
}));

jest.mock('@expo/ui/swift-ui', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Passthrough = (p) => React.createElement(View, p, p.children);
  return {
    Text: Passthrough,
    VStack: Passthrough,
    Link: Passthrough,
    HStack: Passthrough,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  font: jest.fn(() => ({})),
  foregroundStyle: jest.fn(() => ({})),
  padding: jest.fn(() => ({})),
  widgetURL: jest.fn(() => ({})),
  background: jest.fn(() => ({})),
  shapes: {
    roundedRectangle: jest.fn(() => ({ shape: 'roundedRectangle' })),
  },
}));

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
