import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../StreamFlowPanel', () => ({
  __esModule: true,
  StreamFlowPanel: jest.fn(() => null),
}));

import { RecentList } from '../RecentList';
import { StreamFlowPanel } from '../StreamFlowPanel';

function entryToday(text: string): { id: string; text: string; createdAt: string } {
  const d = new Date();
  return {
    id: '1',
    text,
    createdAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).toISOString(),
  };
}

describe('RecentList', () => {
  beforeEach(() => {
    jest.mocked(StreamFlowPanel).mockClear();
  });

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

  it('renders two-line stream empty hint copy', () => {
    const hint = 'Write it down.\nIt stays.';
    const { getByLabelText, getByText } = render(<RecentList entries={[]} visible emptyHint={hint} />);

    expect(getByLabelText(hint)).toBeTruthy();
    expect(getByText('Write it down.')).toBeTruthy();
    expect(getByText('It stays.')).toBeTruthy();
  });

  it('shows stream empty ambient motion region when streamEmptyAmbient is set', () => {
    const { getByTestId } = render(
      <RecentList entries={[]} visible emptyHint="Write it down.\nIt stays." streamEmptyAmbient />
    );

    expect(getByTestId('recent-list-empty-ambient', { includeHiddenElements: true })).toBeTruthy();
    expect(jest.mocked(StreamFlowPanel).mock.calls[0]?.[0]).toMatchObject({ deferMotion: false });
  });

  it('defers StreamFlowPanel motion when deferEmptyStreamMotion is set', () => {
    render(
      <RecentList
        entries={[]}
        visible
        emptyHint="Write it down.\nIt stays."
        streamEmptyAmbient
        deferEmptyStreamMotion
      />
    );

    expect(jest.mocked(StreamFlowPanel).mock.calls[0]?.[0]).toMatchObject({ deferMotion: true });
  });

  it('renders stream empty ambient when composer suppression flag is set', () => {
    const { getByTestId } = render(
      <RecentList
        entries={[]}
        visible
        emptyHint="Write it down.\nIt stays."
        streamEmptyAmbient
        streamEmptyAmbientSuppressed
      />
    );

    expect(getByTestId('recent-list-empty-ambient', { includeHiddenElements: true })).toBeTruthy();
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
