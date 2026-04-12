import type { Firestore } from 'firebase/firestore';

const mockApp = { name: 'test-app' };
const fallbackDb = { _tag: 'fallback' } as unknown as Firestore;

jest.mock('../firebaseApp', () => ({
  getOrInitApp: () => mockApp,
}));

jest.mock('../firebaseAuth', () => ({
  getOrInitAuth: jest.fn(),
}));

const mockInitFirestore = jest.fn();
const mockGetFirestore = jest.fn(() => fallbackDb);

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  initializeFirestore: (...args: unknown[]) => mockInitFirestore(...args),
  memoryLocalCache: jest.fn(() => ({})),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
}));

describe('getOrInitFirestore', () => {
  beforeEach(() => {
    jest.resetModules();
    mockInitFirestore.mockReset();
    mockGetFirestore.mockClear();
    mockInitFirestore.mockImplementation(() => {
      throw new Error(
        'FirebaseError: initializeFirestore() has already been called with different options.'
      );
    });
  });

  it('falls back to getFirestore when initializeFirestore reports duplicate init', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module after resetModules
    const { getOrInitFirestore } = require('../firebaseSync');
    const db = getOrInitFirestore();
    expect(db).toBe(fallbackDb);
    expect(mockGetFirestore).toHaveBeenCalledWith(mockApp);
    expect(getOrInitFirestore()).toBe(db);
    expect(mockGetFirestore).toHaveBeenCalledTimes(1);
  });
});
