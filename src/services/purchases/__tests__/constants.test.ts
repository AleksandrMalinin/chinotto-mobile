describe('purchases constants', () => {
  const key = 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY';
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env[key];
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
    jest.resetModules();
  });

  it('uses empty string when iOS key env is missing', () => {
    delete process.env[key];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constants = require('../constants') as typeof import('../constants');
    expect(constants.REVENUECAT_IOS_API_KEY).toBe('');
  });

  it('trims iOS key value from env', () => {
    process.env[key] = '  appl_demo  ';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constants = require('../constants') as typeof import('../constants');
    expect(constants.REVENUECAT_IOS_API_KEY).toBe('appl_demo');
  });
});
