import {
  STREAM_SEARCH_MISS_LABEL,
  streamSearchResultLabel,
} from '../streamSearchResultLabel';

describe('streamSearchResultLabel', () => {
  it('returns null when search is collapsed or query is empty', () => {
    expect(streamSearchResultLabel(false, 'hi', 3)).toBeNull();
    expect(streamSearchResultLabel(true, '', 3)).toBeNull();
    expect(streamSearchResultLabel(true, '   ', 0)).toBeNull();
  });

  it('returns miss copy when there are no matches', () => {
    expect(streamSearchResultLabel(true, 'xyz', 0)).toBe(STREAM_SEARCH_MISS_LABEL);
  });

  it('formats match counts', () => {
    expect(streamSearchResultLabel(true, 'a', 1)).toBe('1 thought');
    expect(streamSearchResultLabel(true, 'a', 4)).toBe('4 thoughts');
  });
});
