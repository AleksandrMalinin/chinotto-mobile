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

  it('shows Synced and a stable dot when signed in with no upload pending', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" uploadPending={false} onPress={jest.fn()} />
    );

    expect(getByText('Synced')).toBeTruthy();
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Syncing… and pulsing dot when signed in with upload pending', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" uploadPending onPress={jest.fn()} />
    );

    expect(getByText('Syncing…')).toBeTruthy();
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Sync paused when signed in with upload stuck (takes precedence over pending)', () => {
    const { getByText, queryByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" uploadPending uploadStuck onPress={jest.fn()} />
    );

    expect(getByText('Sync paused')).toBeTruthy();
    expect(queryByText('Syncing…')).toBeNull();
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
