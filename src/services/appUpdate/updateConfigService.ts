/**
 * Remote update policy: always tries **Firebase Remote Config** (React Native Firebase) when no
 * custom `fetcher` is passed. Any failure (no native module, web, tests, network) → in-repo
 * {@link mockUpdateConfig} (`enabled: false`), same as RC with `enabled: false`.
 *
 * Pass a custom fetcher into {@link useAppUpdateCheck} to override. JSON shape: {@link UpdateConfig}.
 */
import { fetchUpdateConfigFromRemoteConfig } from './fetchUpdateConfigFromRemoteConfig';
import { mockUpdateConfig } from './mockUpdateConfig';
import type { UpdateConfig } from './types';

export type UpdateConfigFetcher = () => Promise<UpdateConfig>;

export async function fetchUpdateConfigFromMock(): Promise<UpdateConfig> {
  await Promise.resolve();
  return mockUpdateConfig;
}

/**
 * Injected `fetcher` wins; otherwise Remote Config, else fail-closed to {@link mockUpdateConfig}.
 */
export async function fetchUpdateConfig(fetcher?: UpdateConfigFetcher): Promise<UpdateConfig> {
  if (fetcher != null) {
    return fetcher();
  }
  try {
    return await fetchUpdateConfigFromRemoteConfig();
  } catch {
    return { ...mockUpdateConfig };
  }
}
