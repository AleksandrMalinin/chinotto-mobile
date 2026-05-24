import { splitTextBySearchQuery } from '../splitTextBySearchQuery';

describe('splitTextBySearchQuery', () => {
  it('returns a single non-match segment when query is empty', () => {
    expect(splitTextBySearchQuery('Hello world', '  ')).toEqual([
      { text: 'Hello world', match: false },
    ]);
  });

  it('splits on case-insensitive matches', () => {
    expect(splitTextBySearchQuery('Rest is not REST', 'rest')).toEqual([
      { text: 'Rest', match: true },
      { text: ' is not ', match: false },
      { text: 'REST', match: true },
    ]);
  });

  it('returns plain text when there is no match', () => {
    expect(splitTextBySearchQuery('alpha', 'beta')).toEqual([{ text: 'alpha', match: false }]);
  });
});
