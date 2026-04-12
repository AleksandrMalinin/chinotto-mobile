/**
 * Remote update config — **plug-in point for production**
 *
 * Replace {@link fetchUpdateConfig} (or pass a custom fetcher into {@link useAppUpdateCheck}) with
 * something like:
 *
 * ```ts
 * const res = await fetch('https://cdn.example.com/chinotto/update-config.json', {
 *   headers: { Accept: 'application/json' },
 * });
 * if (!res.ok) throw new Error(String(res.status));
 * return (await res.json()) as UpdateConfig;
 * ```
 *
 * Keep the JSON shape aligned with {@link UpdateConfig}. Validate or fail closed in the fetcher.
 */
import { mockUpdateConfig } from './mockUpdateConfig';
import type { UpdateConfig } from './types';

export type UpdateConfigFetcher = () => Promise<UpdateConfig>;

export async function fetchUpdateConfigFromMock(): Promise<UpdateConfig> {
  await Promise.resolve();
  return mockUpdateConfig;
}

/**
 * App entry uses this. Swap the implementation body (or the default argument at call sites)
 * when your backend / CDN is ready.
 */
export async function fetchUpdateConfig(
  fetcher: UpdateConfigFetcher = fetchUpdateConfigFromMock,
): Promise<UpdateConfig> {
  return fetcher();
}
