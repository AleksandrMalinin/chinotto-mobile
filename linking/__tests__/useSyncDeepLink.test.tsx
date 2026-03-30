import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import { useSyncDeepLink } from '../useSyncDeepLink';

const addEventListener = Linking.addEventListener as jest.Mock;
const getInitialURL = Linking.getInitialURL as jest.Mock;

describe('useSyncDeepLink', () => {
  beforeEach(() => {
    getInitialURL.mockReset();
    addEventListener.mockReset();
    getInitialURL.mockResolvedValue(null);
    addEventListener.mockReturnValue({ remove: jest.fn() });
  });

  it('defers callback until phase is main, db and subscription are ready', () => {
    const onSyncDeepLink = jest.fn();
    let urlHandler: ((e: { url: string }) => void) | undefined;
    addEventListener.mockImplementation((_event: string, cb: (e: { url: string }) => void) => {
      urlHandler = cb;
      return { remove: jest.fn() };
    });

    const { rerender } = renderHook(
      (props: { phase: 'boot' | 'brand' | 'welcome' | 'main'; db: boolean; sub: boolean }) =>
        useSyncDeepLink({
          enabled: true,
          phase: props.phase,
          dbReady: props.db,
          subscriptionLoaded: props.sub,
          onSyncDeepLink,
        }),
      { initialProps: { phase: 'welcome' as const, db: true, sub: true } }
    );

    act(() => {
      urlHandler?.({ url: 'https://getchinotto.app/sync' });
    });
    expect(onSyncDeepLink).not.toHaveBeenCalled();

    rerender({ phase: 'welcome', db: true, sub: true });
    expect(onSyncDeepLink).not.toHaveBeenCalled();

    act(() => {
      rerender({ phase: 'main', db: true, sub: true });
    });
    expect(onSyncDeepLink).toHaveBeenCalledTimes(1);
  });

  it('consumes getInitialURL when already on main', async () => {
    const onSyncDeepLink = jest.fn();
    getInitialURL.mockResolvedValue('https://getchinotto.app/sync');

    renderHook(() =>
      useSyncDeepLink({
        enabled: true,
        phase: 'main',
        dbReady: true,
        subscriptionLoaded: true,
        onSyncDeepLink,
      })
    );

    await waitFor(() => expect(onSyncDeepLink).toHaveBeenCalledTimes(1));
  });

  it('does not subscribe when disabled', () => {
    renderHook(() =>
      useSyncDeepLink({
        enabled: false,
        phase: 'main',
        dbReady: true,
        subscriptionLoaded: true,
        onSyncDeepLink: jest.fn(),
      })
    );
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
