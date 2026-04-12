import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import type { UpdateConfig } from '../types';
import { useAppUpdateCheck } from '../useAppUpdateCheck';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0' },
  },
}));

describe('useAppUpdateCheck', () => {
  const origOs = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = origOs;
    jest.restoreAllMocks();
  });

  it('does not fetch when disabled', async () => {
    const fetcher = jest.fn(async (): Promise<UpdateConfig> => ({
      enabled: true,
      minSupportedVersion: '0.0.1',
      latestVersion: '9.0.0',
      forceUpdate: false,
    }));
    const { result } = renderHook(() =>
      useAppUpdateCheck({ enabled: false, fetchConfig: fetcher, getCurrentVersion: () => '1.0.0' }),
    );
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.gate).toBeNull();
  });

  it('shows soft gate when below latest', async () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    const fetcher = jest.fn(async (): Promise<UpdateConfig> => ({
      enabled: true,
      minSupportedVersion: '1.0.0',
      latestVersion: '2.0.0',
      forceUpdate: false,
      iosStoreUrl: 'https://apps.apple.com/app/test',
    }));
    const { result } = renderHook(() =>
      useAppUpdateCheck({ fetchConfig: fetcher, getCurrentVersion: () => '1.0.0' }),
    );
    await waitFor(() => {
      expect(result.current.gate?.kind).toBe('soft');
    });
    expect(result.current.gate?.storeUrl).toBe('https://apps.apple.com/app/test');
  });

  it('clears gate when fetch throws', async () => {
    const fetcher = jest.fn(async (): Promise<UpdateConfig> => {
      throw new Error('network');
    });
    const { result } = renderHook(() => useAppUpdateCheck({ fetchConfig: fetcher }));
    await waitFor(() => {
      expect(result.current.gate).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });
  });

  it('dismissSoft hides soft until next background transition', async () => {
    let handler: ((s: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
      handler = cb as (s: AppStateStatus) => void;
      return { remove: jest.fn() };
    });

    const fetcher = jest.fn(async (): Promise<UpdateConfig> => ({
      enabled: true,
      minSupportedVersion: '1.0.0',
      latestVersion: '2.0.0',
      forceUpdate: false,
    }));
    const { result } = renderHook(() => useAppUpdateCheck({ fetchConfig: fetcher }));
    await waitFor(() => expect(result.current.gate?.kind).toBe('soft'));

    act(() => {
      result.current.dismissSoft();
    });
    expect(result.current.gate).toBeNull();

    act(() => {
      handler?.('active');
    });
    await waitFor(() => expect(result.current.gate).toBeNull());

    act(() => {
      handler?.('background');
    });
    act(() => {
      handler?.('active');
    });
    await waitFor(() => expect(result.current.gate?.kind).toBe('soft'));
  });
});
