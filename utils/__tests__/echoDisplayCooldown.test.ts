import { echoDisplayCooldownDays } from '../echoDisplayCooldown';

describe('echoDisplayCooldownDays', () => {
  it('uses base cooldown for untouched entries', () => {
    expect(echoDisplayCooldownDays(0, 0)).toBe(14);
    expect(echoDisplayCooldownDays(1, 0)).toBe(14);
  });

  it('extends cooldown when opened repeatedly without edit', () => {
    expect(echoDisplayCooldownDays(2, 0)).toBe(21);
    expect(echoDisplayCooldownDays(5, 0)).toBe(21);
  });

  it('uses base cooldown once edited', () => {
    expect(echoDisplayCooldownDays(3, 1)).toBe(14);
  });
});
