# Chinotto Mobile — product state (intermediate)

**Scope:** This file summarizes **current behavior inferred from `chinotto-mobile` implementation** as of the last engineering pass. It is **not** the product vision doc.

**Out of scope here:** The **desktop app** (`chinotto-app` or equivalent) — not in this repository. Desktop features are **not** verified from source in this doc. For sync contract details, see [SYNC.md](./SYNC.md).

**Platform stance (product):** **Apple first on mobile** — iOS is the current shipping focus; **Android parity is planned for later**. On **desktop**, **Windows and Linux clients are planned for a later phase** (desktop implementation is outside this repo). This file states intent for alignment; it is not a release calendar.

---

## 1. Feature inventory (this repo)

### Implemented (mobile)

| Area | Behavior |
|------|----------|
| **Boot** | Native splash until fonts + SQLite ready; ~400ms beat; `BrandSplash` then main or welcome. |
| **First launch** | `WelcomeOnboardingScreen` — copy + `StreamFlowPanel` + **Capture it** → `welcomeFlag` persisted. |
| **Capture** | Single screen; multiline `TextInput`, autoFocus; Done submits → `saveEntry`, clear, refocus. |
| **Composer height** | ~48–80pt on `CaptureScreen` (tight; multiline scrolls inside field). |
| **Recent stream** | Last **20** entries, grouped Today / Yesterday / older days; swipe-left delete; tap → read sheet. |
| **Read sheet** | Full text, copy, timestamp; dismiss tap outside. |
| **List visibility** | Hidden while typing until user scrolls down ~20px (`revealByScroll`), or when input empty. |
| **Persistence** | SQLite `entries` + serialized access (`runSerializedDb`). |
| **Sync (optional)** | Env `EXPO_PUBLIC_FIREBASE_*`; queue on save; 15s background drain; Firestore `setDoc` push; live ingest + tombstone listeners; **paginated `getDocs` backfill** after sign-in for older cloud rows; iOS header: Checking / Syncing… / Sync paused / Synced. |
| **Sign in** | Sign in with Apple + Firebase — **iOS only** in UI (`EnableSyncModal` returns null on Android). |
| **Share** | `expo-sharing` — text / URL / webpage → one entry per extracted string; “Saved” ack. |
| **Widget** | iOS home widget (expo-widgets); gated by `EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET` (on in `__DEV__`). |
| **Deep link** | Widget URL → bump focus nonce → capture input focus. |

### Not implemented (mobile UI)

- Search, calendar navigation, full history list (DB has `getAllEntries()` — **unused** in app code).
- Edit saved entries (read + delete only).
- Voice input.
- Share: images / files / audio / video (by design in `extractShareEntryTexts`).

### Desktop

- **No source in this repo.** Ingest/push **contract** with desktop is documented in [SYNC.md](./SYNC.md) and [DESKTOP_SYNC_IMPLEMENTATION.md](./DESKTOP_SYNC_IMPLEMENTATION.md).

---

## 2. UX flow (user-visible)

1. Open app → splash / brand → capture (or welcome once).
2. Type thought → Done → saved locally immediately → field clears.
3. See recent thoughts when field empty or after scroll while typing.
4. Tap row → sheet; swipe → delete (local-first; tombstone queued if sync on).
5. Optional: share into app → entries saved + list refresh.

**Friction notes:** Boot + welcome add latency vs “instant open”; stream hidden while typing until scroll; only 20 rows visible.

---

## 3. Platform role & roadmap

- **Mobile — iOS (now):** Capture-first companion; minimal recall; optional cloud bridge to the same Firestore namespace as desktop (same Firebase `uid`). Sync affordances target **Sign in with Apple** on **iOS** as the supported path at this stage.
- **Mobile — Android (later):** Builds may exist, but **Android is not a product priority yet** — parity (e.g. sync entry UI, auth) is **explicitly deferred** until Android is scheduled as a shipping target.
- **Desktop:** Intended primary thinking surface per `AGENTS.md` — **not validated here**. **Windows and Linux** desktop apps are **planned for a later phase** (alongside or after whatever desktop platform ships first); they are **not** implemented in this repository.

---

## 4. Gaps vs direction

| Gap | Why it matters |
|-----|----------------|
| No search / full history UI | “Revisit later via search or time” is weak on device for older entries. |
| 20-item UI cap | Ingest may hold more in DB; user cannot browse it. |
| Android + Firebase | No in-app enable path for sync (modal iOS-only) — **acceptable until Android is prioritized**. |
| Welcome screen | One-time `WelcomeOnboardingScreen`; `AGENTS.md` documents this as the only allowed pre-capture orientation. |

---

## 5. Risks (implementation-grounded)

- Pending sync queue while signed out — user may assume cloud backup exists.
- `auth/credential-already-in-use` — user-facing copy explains split cloud libraries; full merge is manual (see [SYNC_APPLE_QA.md](./SYNC_APPLE_QA.md)).
- Firestore listener limits (500 recent live ingest + 1000 tombstones); older **active** rows also load via **paginated backfill** after sign-in (see SYNC.md). Extreme counts (20k+ creates) may still need tuning.

---

## 6. Suggested priorities (product, not code style)

1. Keep boot + one-time welcome minimal; steady state must remain capture-first per `AGENTS.md`.
2. Add lightweight recall: search and/or scrollable history beyond 20.
3. When Android is prioritized: sync entry point + auth parity with iOS.
4. Clearer non-blocking sync state when queue is pending / signed out.
5. Stabilize and ship widget + clarify share capabilities.

---

## 7. Related docs

- [SYNC.md](./SYNC.md) — normative sync phases, Firestore layout, tombstones.
- [DESKTOP_SYNC_IMPLEMENTATION.md](./DESKTOP_SYNC_IMPLEMENTATION.md) — desktop handoff spec.
- [SYNC_APPLE_QA.md](./SYNC_APPLE_QA.md) — Apple-only sync sanity checklist (devices + `credential-already-in-use`).
- [AGENTS.md](../AGENTS.md) — agent/product constraints for this repo.

---

*Intermediate doc — update when shipping meaningful UX or sync changes.*
