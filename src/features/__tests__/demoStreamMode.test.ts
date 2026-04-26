describe('isDemoStreamMode', () => {
  const key = 'EXPO_PUBLIC_DEMO_STREAM';

  beforeEach(() => {
    delete process.env[key];
    jest.resetModules();
  });

  function load(): { isDemoStreamMode: () => boolean } {
    return require('../demoStreamMode');
  }

  it('is false when unset', () => {
    expect(load().isDemoStreamMode()).toBe(false);
  });

  it.each(['1', 'true', 'yes', 'on', 'TRUE', ' Yes '])('is true for %j', (v) => {
    process.env[key] = v;
    jest.resetModules();
    expect(load().isDemoStreamMode()).toBe(true);
  });
});
