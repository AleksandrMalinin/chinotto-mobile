/**
 * Loads {@link UpdateConfig} from Firebase Remote Config using React Native Firebase.
 *
 * @see https://rnfirebase.io/remote-config/usage
 *
 * Console: parameter {@link APP_UPDATE_REMOTE_CONFIG_KEY} (string) — JSON matching {@link UpdateConfig}.
 * Starter for **Import template**: `docs/app-update/firebase-remote-config-template.json` (see
 * `docs/app-update/README.md`). In-app defaults match {@link mockUpdateConfig} until you publish.
 */
import remoteConfig from '@react-native-firebase/remote-config';

import { mockUpdateConfig } from './mockUpdateConfig';
import { parseUpdateConfigJson } from './parseUpdateConfigJson';

/** Remote Config parameter key — single JSON object string. */
export const APP_UPDATE_REMOTE_CONFIG_KEY = 'chinotto_app_update_json';

const DEFAULT_JSON = JSON.stringify(mockUpdateConfig);

/** Dev: 1 min minimum fetch interval. Production: 12 h (Firebase default cache window). */
const MIN_FETCH_INTERVAL_MS = __DEV__ ? 60_000 : 43_200_000;

export async function fetchUpdateConfigFromRemoteConfig(): Promise<UpdateConfig> {
  const rc = remoteConfig();

  await rc.setDefaults({
    [APP_UPDATE_REMOTE_CONFIG_KEY]: DEFAULT_JSON,
  });

  await rc.setConfigSettings({
    minimumFetchIntervalMillis: MIN_FETCH_INTERVAL_MS,
  });

  await rc.fetchAndActivate();

  const raw = rc.getValue(APP_UPDATE_REMOTE_CONFIG_KEY).asString();
  return parseUpdateConfigJson(raw);
}
