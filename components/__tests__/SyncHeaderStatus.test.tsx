import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AdaptiveChromeContext, colorsDark } from '../../theme';
import { SyncHeaderStatus } from '../SyncHeaderStatus';

describe('SyncHeaderStatus', () => {
  it('shows Checking sync and dot while restoring', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="restoring" onPress={jest.fn()} />
    );

    expect(getByText('Checking sync')).toBeTruthy();
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Sync on and a stable dot when signed in with no upload pending', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" uploadPending={false} onPress={jest.fn()} />
    );

    const label = getByText('Sync on');
    expect(label).toBeTruthy();
    const flat = StyleSheet.flatten(label.props.style) as { color?: string };
    expect(flat.color).toBe(colorsDark.fgDim);
    expect(getByTestId('sync-header-dot')).toBeTruthy();
  });

  it('shows Syncing… and pulsing dot when signed in with upload pending', () => {
    const { getByText, getByTestId } = render(
      <SyncHeaderStatus phase="signed_in" uploadPending onPress={jest.fn()} />
    );

    const label = getByText('Syncing…');
    expect(label).toBeTruthy();
    const flat = StyleSheet.flatten(label.props.style) as { color?: string };
    expect(flat.color).toBe(colorsDark.muted);
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
    const { getByTestId, queryByTestId } = render(
      <SyncHeaderStatus phase="signed_out" onPress={jest.fn()} />
    );

    expect(getByTestId('enable-sync-headline-gradient-label')).toBeTruthy();
    expect(queryByTestId('sync-header-dot')).toBeNull();
  });

  it('shows Enable sync when signed out in Sunlight chrome (full blend)', () => {
    const { getByTestId } = render(
      <AdaptiveChromeContext.Provider
        value={{ blendProgress: 1, displayChrome: 'auto', setDisplayChrome: jest.fn() }}
      >
        <SyncHeaderStatus phase="signed_out" onPress={jest.fn()} />
      </AdaptiveChromeContext.Provider>
    );

    expect(getByTestId('enable-sync-headline-gradient-label')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SyncHeaderStatus phase="signed_out" onPress={onPress} />);

    fireEvent.press(getByTestId('sync-header-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('plays one-shot enable-sync shimmer and calls onComplete after timing', () => {
    jest.useFakeTimers();
    try {
      const onComplete = jest.fn();
      const { getByTestId } = render(
        <SyncHeaderStatus
          phase="signed_out"
          onPress={jest.fn()}
          enableSyncLabelShimmer
          onEnableSyncLabelShimmerComplete={onComplete}
        />
      );

      expect(getByTestId('enable-sync-label-shimmer')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(2800);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

});
