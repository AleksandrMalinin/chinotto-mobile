import type { UpdateConfig } from './types';

/**
 * Default policy while no remote endpoint is wired. **`enabled: false`** keeps shipping builds
 * unchanged until you flip this (or swap {@link fetchUpdateConfig} for a network implementation).
 */
export const mockUpdateConfig: UpdateConfig = {
  enabled: false,
  minSupportedVersion: '1.0.0',
  latestVersion: '1.0.0',
  forceUpdate: false,
  iosStoreUrl: '',
};
