# Chinotto — watchOS companion (single reference)

**Scope:** wire contract between the Apple Watch app and the iPhone host, the watch UX guardrails, the on-watch voice engine, the iPhone receiver, and the watch app target layout. **Normative for** Watch ↔ iPhone payloads via `WatchConnectivity`; downstream sync to Firestore is unchanged and remains governed by [`docs/sync/sync.md`](../sync/sync.md).

The watch is a **pure input device**. It never reads SQLite, never reads Firestore, never lists entries, never renders past thoughts, and never authenticates. Thinking and recall happen on iPhone and desktop — see [`docs/product/product-spec.md`](../product/product-spec.md).

**Status**

| Layer | Status | Summary |
|-------|--------|---------|
| **Watch app target** | Not yet shipped | New SwiftUI `WKApplication` target `ChinottoWatch`, gated behind `EXPO_PUBLIC_EXPERIMENTAL_WATCH=1` (mirrors the home-widget rollout). |
| **Voice on watch** | Not yet shipped | Reuses `SFSpeechRecognizer` engine from iOS via shared Swift source; same RMS thresholds and silence cutoff as iPhone. |
| **WC transport** | Not yet shipped | `WCSession.transferUserInfo` from watch to iPhone; iPhone forwards to existing `saveEntry` code path. |
| **Complication** | Not yet shipped | WidgetKit launch complication, deep-links into immediate recording. |

**Cross-references:** **Wire contract for entries** — [`docs/sync/sync.md` §1](../sync/sync.md). **iOS home widget payload** — [`docs/sync/sync.md` §5.1](../sync/sync.md). **Product principles** — [`docs/product/product-spec.md`](../product/product-spec.md). **Code architecture** — [`docs/engineering/architecture.md`](../engineering/architecture.md).

---

## 1. Watch → iPhone payload (WC envelope)

The watch generates a complete `Entry` and ships it to the iPhone in a single `WCSession.transferUserInfo` payload. The inner fields **MUST** match the wire contract in [`docs/sync/sync.md` §1](../sync/sync.md) so the iPhone can write directly to its local store and let the existing sync queue carry the entry to Firestore unchanged.

| Field | Type | Meaning |
|--------|------|--------|
| `v` | `number` | Envelope version. **`1`** for this spec. Unknown versions are dropped on the iPhone with a log line. |
| `op` | `string` | Operation discriminator. **`"saveEntry"`** for capture. Reserved for future watch-side ops (e.g. delete from watch, telemetry beacon) without breaking the receiver. |
| `id` | `string` | Stable unique identifier (UUID v4). Generated **on the watch** and immutable for the life of the entry. |
| `text` | `string` | User-visible body. Trimmed on the watch before transfer; receiver re-trims defensively. |
| `createdAt` | `string` | ISO 8601 UTC (e.g. `2026-04-26T12:34:56.789Z`). The instant of capture **on the watch**, not the instant the iPhone received it. |

### Example

```json
{
  "v": 1,
  "op": "saveEntry",
  "id": "8e84b9a8-2b6f-4d58-9d5a-9f4d3e1a0c11",
  "text": "follow up on the espresso machine warranty",
  "createdAt": "2026-04-26T12:34:56.789Z"
}
```

### Invariants

- `id` is the **same** id used downstream in SQLite and Firestore. No translation; no per-transport identifier.
- `createdAt` is set on the watch and **never** rewritten downstream. The iPhone uses the watch's instant to preserve correct stream ordering, even when WC delivery is delayed.
- An empty / whitespace-only `text` is **rejected on the iPhone**; the watch is expected to never send one (the recorder requires a non-empty final transcript), but the receiver validates defensively.
- A malformed `id` (not a UUID-shaped string) is **rejected on the iPhone**.

### Idempotency

- The same payload may be redelivered (WC retries, app re-launches with queued user-info). The receiver **MUST** be idempotent on `id`.
- Idempotency is enforced at the SQLite layer via `INSERT OR IGNORE INTO entries` in `saveEntryWithId` (see §6). The existing `sync_queue` is already idempotent on `(entryId)`, so a re-delivery never produces a duplicate Firestore push.

### Ordering

- Sort by `createdAt`; tie-break by `id` lexicographically — same rule as [`docs/sync/sync.md` §1 / Ordering](../sync/sync.md). Watch-captured entries interleave naturally with iPhone-captured entries on the recent stream.

---

## 2. Transport (locked)

**Chosen:** `WCSession.transferUserInfo(_:)`.

Of the four `WCSession` channels, this is the only one that:

- **Persists across reboots and unpaired states.** The watchOS WC outbox holds the user-info dictionaries until the iPhone is reachable.
- **Wakes the iPhone app in the background** to receive even when the host app is suspended.
- **Preserves order** per device and is delivered (modulo OS-surfaced retries the receiver dedupes via idempotency).

| Channel | Why not |
|---------|---------|
| `sendMessage` | Requires the counterpart to be foreground / reachable; not durable. Wrong fit for capture. |
| `transferFile` | Heavyweight; designed for media. Overkill for ~100-byte payloads. |
| `updateApplicationContext` | Retains only the **latest** value per-app — would lose entries when the user captures two thoughts back-to-back before the iPhone receives. **Disqualifying.** |
| `transferUserInfo` | **Selected.** Queued, durable, ordered, background-deliverable. |

**Activation:** the watch activates `WCSession.default` at app launch in `WatchSessionManager.activate()`. The iPhone activates in `WatchSessionBridge.activate()`, called from `AppDelegate` immediately after `FirebaseApp.configure()` (see §6). Both sides set themselves as the `WCSession.delegate` before calling `activate()`.

**Failure mode:** if WC is unavailable on either side (e.g. simulator paired incorrectly, no watch paired), the watch UI still shows "Saved" — the entry is held by the watch's WC outbox indefinitely and flushes when the system pairs. The iPhone never blocks on receipt.

---

## 3. Watch app target

### Layout

| Path | Role |
|------|------|
| `ios/ChinottoWatch/` | SwiftUI `WKApplication` watch app target. |
| `ios/ChinottoWatchComplication/` | WidgetKit extension target — single launch complication (no list, no preview). |
| `ios/Shared/VoiceCaptureCore.swift` | Speech engine shared with iOS app target via Xcode "Target Membership". |

### Bundle identifiers

Apple's pairing convention requires the watch app id to be the host id with the `watchkitapp` suffix.

| Target | Bundle id |
|--------|-----------|
| Host iOS app | `com.chinotto.mobile` |
| Watch app | `com.chinotto.mobile.watchkitapp` |
| Watch complication | `com.chinotto.mobile.watchkitapp.complication` |

### Minimum watchOS

**watchOS 10.0.** Justification:

- Modern WidgetKit complications replaced ClockKit in watchOS 10 — the launch complication is materially simpler.
- `SFSpeechRecognizer` is reliably usable on-watch from watchOS 10 onwards (with `requiresOnDeviceRecognition = true` when supported).
- SwiftUI quirks affecting watch layout were largely resolved by watchOS 10.

watchOS 10 covers Apple Watch Series 4 and later. Falling back to watchOS 9 forces ClockKit complications and adds meaningful complexity — not justified given the iOS-first product stance.

### Entitlements

`ios/ChinottoWatch/ChinottoWatch.entitlements`:

```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.chinotto.mobile</string>
</array>
```

That is the **only** entitlement on the watch. Specifically **not** present:

- No `com.apple.developer.applesignin` — the watch never authenticates.
- No `aps-environment` — no push.
- No `com.apple.developer.associated-domains` — no universal links.

The App Group is shared with the host (mirroring [`docs/sync/sync.md` §5.1](../sync/sync.md)) so future diagnostics could read the same `UserDefaults` suite, but it is **not** the transport for entry payloads — that is exclusively `WCSession.transferUserInfo` per §2.

### Info.plist (Watch app)

| Key | Value |
|-----|-------|
| `WKApplication` | `YES` (single-target SwiftUI watch app — no separate WatchKit extension target). |
| `WKWatchOnly` | `NO` (companion to iOS app). |
| `NSMicrophoneUsageDescription` | `"Chinotto records a short voice thought on your watch."` |
| `NSSpeechRecognitionUsageDescription` | `"Chinotto turns what you say on watch into a thought you'll see on your phone."` |

The watch carries its **own** privacy descriptions — the iOS app's strings do not propagate.

### Surviving `expo prebuild`

The repo's pattern for native iOS targets is config-plugin driven (see `expo-widgets` for the home widget in [`app.json`](../../app.json)). The watch follows the same pattern via a new plugin.

| File | Role |
|------|------|
| `plugins/withWatchTarget.js` | Idempotent `dangerous` mod. Ensures `ios/ChinottoWatch/` and `ios/ChinottoWatchComplication/` survive prebuild and patches `Chinotto.xcodeproj/project.pbxproj` to register the watch + complication targets, the embed-watch-content build phase, and the App Group entitlement. |
| `app.json` → `expo.plugins` | Plugin registered with `{ groupIdentifier, watchBundleIdentifier, complicationBundleIdentifier, minimumWatchOSVersion }`. |
| `app.json` → `extra.eas.build.experimental.ios.appExtensions` | Watch app + complication entries (siblings of `expo-sharing-extension`) so EAS Build signs them. |
| `app.config.js` | Filters `withWatchTarget` out of `plugins` unless `EXPO_PUBLIC_EXPERIMENTAL_WATCH === '1'` — same gating shape as `EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET`. |

`@bacons/apple-targets` is **not** adopted: as of 2026-04 it has watch-widget presets but no full watch-app preset. Migrate later if/when one lands.

---

## 4. Voice on watch

### Shared engine

`ios/Shared/VoiceCaptureCore.swift` is a new file extracted from the body of `ios/Chinotto/VoiceCaptureModule.swift`. It is a member of **both** the iOS app target and the watch app target.

| Constant | Value | Source of truth |
|----------|-------|-----------------|
| `maxDurationSeconds` | `10` | Shared core — must match across iPhone and watch. |
| `silenceStopSeconds` | `1.25` | Shared core. |
| `speechRmsThreshold` | `0.022` | Shared core. |
| `silenceRmsThreshold` | `0.012` | Shared core. |

`VoiceCaptureModule.swift` becomes a thin RN-bridging wrapper around `VoiceCaptureCore`. The watch wraps the same core in an `ObservableObject` consumed by `CaptureViewModel`. Platform-specific lifecycle hooks are guarded behind `#if os(iOS)` / `#if os(watchOS)`.

These constants are the product's **voice** — the way Chinotto listens. They must stay in lockstep across iPhone and watch; sharing source is the cheapest way to guarantee that.

### Recognition mode

- `SFSpeechAudioBufferRecognitionRequest` with `requiresOnDeviceRecognition = true` whenever `SFSpeechRecognizer.supportsOnDeviceRecognition == true`.
- Locale: `Locale.current` on the watch. There is no settings screen on the watch; users wanting a non-default locale set it on iPhone Settings → Language & Region.
- Permissions requested on first start: microphone (`AVAudioApplication.requestRecordPermission`) and speech (`SFSpeechRecognizer.requestAuthorization`).

### Fallback to dictation

If `SFSpeechRecognizer.authorizationStatus() != .authorized` or `SFSpeechRecognizer.isAvailable == false` after `start()`, the view immediately presents `presentTextInputController(.allowDictation, .plain)` — the OS-native dictation/Scribble/emoji picker. The user still saves a thought; the entry travels the same WC pipeline.

---

## 5. Watch UI

Single-screen app. No `NavigationStack`, no tabs, no list, no past entries.

### State machine (single `@StateObject CaptureViewModel`)

| State | Display | Transitions |
|-------|---------|-------------|
| **Ready** | Large circular mic button center, "Tap to capture" label below; tiny `T` button bottom-right for dictation. | Tap mic → **Listening**. Long-press mic or tap `T` → dictation sheet. |
| **Listening** | Mic pulses; live partial transcript above in a single multi-line `Text` (auto-truncating). | 1.25 s silence OR 10 s max OR Crown / mic tap → finalize → **Saved**. Permission denied → dictation sheet. |
| **Saved** (≈ 900 ms) | Checkmark + "Saved" copy + `.success` haptic. | Auto-return to **Ready**. No "view it" — there is nothing to view here. |
| **Error** | Brief red copy. | If permission-related: jump to dictation sheet. Otherwise return to **Ready**. |

### Complication (launch into recording)

A separate WidgetKit extension target `ChinottoWatchComplication`. One static `Widget` with `.supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner])`, rendering the Chinotto logo mark (port from `ios/ExpoWidgetsTarget/CaptureHomeWidget.swift`).

Whole surface uses `widgetURL(URL(string: "chinotto-watch://capture")!)`. The watch app's root scene handles `.onOpenURL`:

- URL is `chinotto-watch://capture` → call `CaptureViewModel.startRecording()` immediately, **skipping the Ready state**. One tap from the watch face = recording.

This mirrors the iOS widget's `chinotto://capture?mode=voice` deep-link contract from [`docs/sync/sync.md` §5.1](../sync/sync.md), translated to the watch's own URL scheme.

### Out of scope (explicitly)

- No entry list / history view on watch.
- No editing, no deleting past entries from watch.
- No settings UI on watch.
- No Sign-in-with-Apple flow on watch.
- No Firebase SDK on watch (size + auth duplication + violates "no thinking on watch").
- No Firestore reads on watch.
- No "recent thoughts" complication mode — only launch-into-recording.
- No Live Activities, no notifications.

These exclusions are normative. Anything richer drifts the watch into a thinking surface and violates [`docs/product/product-spec.md`](../product/product-spec.md) and [`AGENTS.md`](../../AGENTS.md).

---

## 6. iPhone implementation (this repo)

| Module | Role |
|--------|------|
| `ios/Chinotto/WatchSessionBridge.swift` | Singleton `WCSessionDelegate`. Activated from `AppDelegate.application(_:didFinishLaunchingWithOptions:)` after `FirebaseApp.configure()`. Validates payloads from §1 and forwards to `WatchInboxModule`. |
| `ios/Chinotto/WatchInboxModule.swift` + `.m` | `RCTEventEmitter` that re-emits the payload to JS as `WatchInboxEntry` events (mirrors the bridging pattern of `VoiceCaptureModule`). |
| `sync/watchInbox.ts` | JS subscriber. At app boot, listens for `WatchInboxEntry` events and calls `saveEntryWithId(id, text, createdAt)`. Failures are logged; the WC outbox redelivers on the next session activation, so transient errors self-heal. |
| `storage/entryRepository.ts` (modified) | New `saveEntryWithId(id, text, createdAt)` — sibling of `saveEntry`. Same transaction shape; uses **`INSERT OR IGNORE INTO entries`** for retry-safety; skips `insertPendingSyncItem` when the row already exists. Validates `id` is UUID-shaped, `createdAt` parses as ISO 8601, and `text` is non-empty after trim. |

The iPhone receiver path is intentionally a **straight pipe** into `saveEntry`'s existing code path. Once the entry is in SQLite + `sync_queue`, the standard `sync/syncEngine.ts` → `sync/firebaseSync.ts` → `users/{uid}/entries/{id}` push runs unchanged — see [`docs/sync/sync.md` §4](../sync/sync.md).

### Activation order on iPhone boot

1. `AppDelegate.application(_:didFinishLaunchingWithOptions:)` runs.
2. Inside the existing `#if os(iOS)` block, after `FirebaseApp.configure()` (lines 26–28 of `AppDelegate.swift`, **outside** the `@generated` markers):
   ```swift
   WatchSessionBridge.shared.activate()
   ```
3. React Native bridge boots; `sync/watchInbox.ts` subscribes to `WatchInboxModule`.
4. Any user-info already queued by the watch is delivered to the bridge (which buffers any events that fire before JS subscribed) and flushed into `saveEntryWithId`.

### Cold-launch race

If a payload arrives before JS has subscribed to `WatchInboxModule`, the bridge buffers it briefly (in-memory) and replays on first subscription. If the app crashes or is killed mid-receive, `transferUserInfo` retains the payload on the watch and redelivers — `INSERT OR IGNORE` makes the redelivery harmless.

---

## 7. Failure modes & guarantees

| Scenario | Watch behavior | iPhone behavior | Net effect |
|----------|---------------|-----------------|-----------|
| iPhone unreachable (off, in another room) | UI says "Saved"; payload sits in WC outbox. | Nothing yet. | Entry delivered when iPhone is reachable; sync to Firestore happens after. |
| iPhone reachable but Chinotto suspended | UI says "Saved"; WC delivery wakes the iOS app in background. | Bridge receives in background; writes SQLite; sync queue picks it up. | Entry visible on next iPhone foreground. |
| Mic permission denied on watch | Recorder cannot start; UI immediately shows dictation sheet. | Same path as voice once dictation completes. | Entry saved via OS dictation fallback. |
| Speech recognition unavailable on watch | Same as permission denied — dictation fallback. | Same. | Entry saved. |
| Duplicate WC delivery (OS retry) | n/a | `INSERT OR IGNORE` in `saveEntryWithId` short-circuits; no `sync_queue` row added. | Single row, single Firestore push. |
| Two captures in quick succession | Two distinct `transferUserInfo` calls with distinct `id`s. | Both rows inserted; both pushed. | Both entries arrive in order on iPhone and Firestore. |
| Multi-paired watches (two watches → one phone) | Each watch transfers independently. | Bridge receives both; UUIDs are unique → no collision. | All entries land. |

---

## 8. Privacy & permissions

- **Microphone** and **speech recognition** are requested on the watch on first capture. The descriptions are listed in §3.
- Audio **never leaves the watch**. `requiresOnDeviceRecognition = true` is set whenever supported. Only the **finalized text transcript** is transferred to the iPhone via WC.
- The watch app does **not** authenticate, does **not** send analytics, does **not** access location, contacts, motion, or health data.
- The watch never reads or writes Firestore directly. All cloud transit happens from the iPhone, governed by the existing rules and identity model in [`docs/sync/sync.md` §3 and §7](../sync/sync.md).

---

## 9. Practical checklist

1. **App.json:** add `["./plugins/withWatchTarget.js", { ... }]` to `expo.plugins`; add watch + complication entries under `extra.eas.build.experimental.ios.appExtensions`.
2. **App.config.js:** extend the existing plugin filter (lines 21–27) to also gate `withWatchTarget` behind `EXPO_PUBLIC_EXPERIMENTAL_WATCH === '1'`.
3. **`pnpm expo prebuild`** with `EXPO_PUBLIC_EXPERIMENTAL_WATCH=1` set; the plugin registers the watch + complication targets in `Chinotto.xcodeproj`.
4. **Xcode:** open `Chinotto.xcworkspace`; verify `ChinottoWatch` and `ChinottoWatchComplication` schemes; verify App Group entitlement on the watch target; verify `VoiceCaptureCore.swift` is in both iOS app and watch app targets.
5. **iPhone:** add `WatchSessionBridge.shared.activate()` to `AppDelegate.swift` after `FirebaseApp.configure()` (outside the `@generated` markers).
6. **Storage:** add `saveEntryWithId` to `storage/entryRepository.ts` with `INSERT OR IGNORE`; add Jest coverage in `storage/__tests__/saveEntryWithId.test.ts` (happy path, idempotency, malformed UUID / ISO / empty text rejection).
7. **JS bridge:** add `sync/watchInbox.ts`; subscribe at app boot; add Jest coverage in `sync/__tests__/watchInbox.test.ts` (drop malformed payloads, single call per valid payload, single row on duplicate id).
8. **Smoke test:** see §10.
9. **App Store note:** when submitting, add a reviewer note explaining the intentionally minimal one-screen watch UI ("input-only by design; thinking happens on phone/desktop").

---

## 10. Verification

End-to-end smoke test (paired Apple Watch or paired simulator):

1. Build the **ChinottoWatch** scheme in Xcode; install on the paired watch.
2. From the watch face, tap the Chinotto complication. Watch app opens **directly into recording** (mic pulsing); no Ready intermediate state.
3. Speak "test thought one". Watch shows live partial transcript; 1.25 s silence triggers final + "Saved" flash.
4. Within ~1–3 s, switch to iPhone. Open Chinotto. "test thought one" sits at the top of the recent list.
5. Sign in on iPhone with Apple. Confirm Firestore document at `users/{uid}/entries/<watch-generated-id>` with matching `text` and `createdAt`.
6. Airplane-mode the iPhone. Record "offline thought" on watch; UI says "Saved". Take iPhone off airplane mode → entry arrives within ~30 s, then propagates to Firestore.
7. Deny mic permission in watch Settings. Tap mic → dictation sheet. Dictate "fallback thought". Confirm it lands on iPhone identically.
8. Background-wake: kill iPhone Chinotto entirely, record on watch, then open iPhone Chinotto. Entry appears.
9. Idempotency: in Xcode, manually call `WCSession.transferUserInfo` twice with the same payload. Confirm a single row in SQLite and a single Firestore push.
10. Privacy: verify `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` strings appear correctly in iOS Settings → Chinotto → Apple Watch.

Jest unit coverage (per [`AGENTS.md` Testing policy](../../AGENTS.md)):

- `storage/__tests__/saveEntryWithId.test.ts` — happy path; idempotent re-call (same id → single row, no second `sync_queue` insert); empty / whitespace text rejected; malformed UUID rejected; malformed ISO rejected.
- `sync/__tests__/watchInbox.test.ts` — drops payload missing `op`; drops bad UUID; drops empty text; calls `saveEntryWithId` exactly once for a valid payload; single row on duplicate-id payload (mock the repo).

---

## 11. Risks & open questions

- **watchOS 10 minimum** narrows audience to Series 4+. Confirm acceptable before shipping.
- **Custom config plugin maintenance.** A `pbxproj`-patching plugin is the brittlest piece. Mitigation: keep the plugin small, gate it behind `EXPO_PUBLIC_EXPERIMENTAL_WATCH`, and commit the rendered `pbxproj` so regressions are loud.
- **`@bacons/apple-targets` evolution.** When/if it adds a watchOS app preset, migrate to it and delete the custom plugin.
- **WC background-delivery latency.** `transferUserInfo` is "soon, not now" — typically seconds, occasionally tens of seconds. The watch UI does **not** show "synced" status (would violate the watch's input-only stance). "Saved" honestly means *captured locally on the WC outbox*.
- **Open question — analytics.** Should the watch emit `watch_capture_started` / `watch_capture_saved` Umami events via the iPhone? Recommend deferring to a follow-up.
- **Open question — locale.** Watch defaults to `Locale.current`. Document in product copy if needed.

---

## Changelog

Record **implementation** and cross-repo **alignment** changes for the watch here.

| Date | Change |
|------|--------|
| _pending first ship_ | Initial spec — Watch ↔ iPhone WC envelope (§1), `WCSession.transferUserInfo` transport (§2), watch app target layout (§3), shared `VoiceCaptureCore` engine (§4), one-screen capture UX (§5), iPhone receiver via `WatchSessionBridge` + `WatchInboxModule` + `saveEntryWithId` (§6). |
