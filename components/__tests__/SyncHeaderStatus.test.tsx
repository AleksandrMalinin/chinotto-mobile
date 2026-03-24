import { fireEvent, render } from '@testing-library/react-native';

import { SyncHeaderStatus } from '../SyncHeaderStatus';

describe('SyncHeaderStatus', () => {
  it('shows Checking sync and dot while restoring', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="restoring" onPress={jest.fn()} />
    );

    expect(getByText('Checking sync')).toBeTruthy();
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Synced and a stable dot when signed in', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" onPress={jest.fn()} />
    );

    expect(getByText('Synced')).toBeTruthy();
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Enable sync with no dot when signed out', () => {
    const { getByText, queryByTestId } = render(
      <SyncHeaderStatus phase="signed_out" onPress={jest.fn()} />
    );

    expect(getByText('Enable sync')).toBeTruthy();
    expect(queryByTestId('sync-header-dot')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SyncHeaderStatus phase="signed_out" onPress={onPress} />);

    fireEvent.press(getByTestId('sync-header-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
