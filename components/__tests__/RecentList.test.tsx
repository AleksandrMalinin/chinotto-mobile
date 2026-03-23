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
});
