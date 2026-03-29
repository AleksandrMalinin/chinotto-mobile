import { chinottoLogoLeadingOutset } from '../ChinottoLogo';

describe('chinottoLogoLeadingOutset', () => {
  it('matches viewBox geometry (ring left at 10/64 of size)', () => {
    expect(chinottoLogoLeadingOutset(64)).toBe(10);
    expect(chinottoLogoLeadingOutset(42)).toBeCloseTo((42 * 10) / 64, 5);
  });
});
