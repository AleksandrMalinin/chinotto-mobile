import { echoPalimpsestRimExcerpt } from '../echoPalimpsestRim';

describe('echoPalimpsestRimExcerpt', () => {
  it('truncates long text', () => {
    expect(echoPalimpsestRimExcerpt('one two three four five six seven eight')).toBe(
      'one two three four…',
    );
  });

  it('returns short text unchanged', () => {
    expect(echoPalimpsestRimExcerpt('short')).toBe('short');
  });
});
