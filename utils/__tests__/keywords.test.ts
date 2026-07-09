import { keywordOverlap } from '../keywords';

describe('keywordOverlap', () => {
  it('counts shared tokens', () => {
    expect(keywordOverlap('api refactor error handling', 'api error release')).toBe(2);
  });
});
