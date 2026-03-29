import { fireEvent, render } from '@testing-library/react-native';

import { RecentList } from '../RecentList';

function entryToday(text: string): { id: string; text: string; createdAt: string } {
  const d = new Date();
  return {
    id: '1',
    text,
    createdAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).toISOString(),
  };
}

describe('RecentList', () => {
  it('renders entry text when visible', () => {
    const { getByText, getByTestId } = render(<RecentList entries={[entryToday('hello')]} visible />);

    expect(getByTestId('recent-list')).toBeTruthy();
    expect(getByText('hello')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(<RecentList entries={[entryToday('hello')]} visible={false} />);

    expect(queryByTestId('recent-list')).toBeNull();
  });

  it('invokes onEntryPress when a row is pressed', () => {
    const e = entryToday('tap me');
    const onEntryPress = jest.fn();
    const { getByTestId } = render(
      <RecentList entries={[e]} visible onEntryPress={onEntryPress} onEntryDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId(`recent-entry-${e.id}`));
    expect(onEntryPress).toHaveBeenCalledWith(e);
  });

  it('shows emptyHint when visible and entries are empty', () => {
    const { getByTestId, getByText } = render(
      <RecentList entries={[]} visible emptyHint="No matches" />
    );

    expect(getByTestId('recent-list')).toBeTruthy();
    expect(getByTestId('recent-list-empty-hint')).toBeTruthy();
    expect(getByText('No matches')).toBeTruthy();
  });

  it('shows compact URL in row text while keeping full text in a11y label', () => {
    const e = entryToday('see https://www.example.com/wiki/Tea');
    const { getByLabelText, getByText } = render(<RecentList entries={[e]} visible />);

    expect(getByText(/see example\.com\/wiki\/Tea/)).toBeTruthy();
    expect(getByLabelText(/see https:\/\/www\.example\.com\/wiki\/Tea/)).toBeTruthy();
  });

  it('shows listFooterHint below rows when provided', () => {
    const { getByTestId, getByText } = render(
      <RecentList
        entries={[entryToday('hello')]}
        visible
        listFooterHint="Showing first 300 matches"
      />
    );

    expect(getByTestId('recent-list-footer-hint')).toBeTruthy();
    expect(getByText('Showing first 300 matches')).toBeTruthy();
  });

  it('accepts highlightEntryId without breaking row render', () => {
    const e = entryToday('just landed');
    const { getByTestId, getByText } = render(
      <RecentList entries={[e]} visible highlightEntryId={e.id} />
    );

    expect(getByTestId('recent-list')).toBeTruthy();
    expect(getByText('just landed')).toBeTruthy();
  });
});
