# App update (Remote Config)

## Import a template in Firebase

1. Open [Remote Config](https://console.firebase.google.com/) → your project → **Remote Config**.
2. Use **Import template** / **Publish from file** (wording varies): upload **`firebase-remote-config-template.json`** from this folder.
3. Review parameters, then **Publish changes**.

Template shape follows Firebase [client templates](https://firebase.google.com/docs/remote-config/templates). Parameter **`chinotto_app_update_json`** must stay in sync with the app (`APP_UPDATE_REMOTE_CONFIG_KEY` in `fetchUpdateConfigFromRemoteConfig.ts`).

The app **always** attempts Remote Config on startup (no env flag). If the native SDK is missing (e.g. tests, web) or fetch throws, policy falls back to the in-repo mock (`enabled: false`). Ship a **native** build with `GoogleService-*` in the project root per `app.json`.

JSON may omit `androidStoreUrl` (and `iosStoreUrl` if empty) until those store links exist; add `androidStoreUrl` when Play is live.
