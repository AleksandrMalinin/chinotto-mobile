# Cross-device sync unlock — user flow & state model

**Canonical product + engineering reference** for how desktop knows mobile has **actually** unlocked paid sync, and how **Sign in with Apple on this Mac** / **Sync is on** are gated.

**Repos:** Mobile (`chinotto-mobile`) owns RevenueCat + mirror writes. Desktop (`chinotto-app`) owns `SyncModal` + listeners.

**Wire details:** Firestore paths and rules — [`sync.md`](./sync.md) §3.

---

## A. Core state model (three different ideas)

| Concept | Meaning | Where it lives |
|--------|---------|----------------|
| **Sync unlocked** (product) | User has **entitlement** to use cloud sync: RevenueCat **Chinotto Pro** (or paywall disabled in dev/shipped config). | Mobile: StoreKit + RevenueCat + local cache. **Durable cross-device flag:** `users/{uid}.chinottoSyncAccess.active === true` in Firestore (written by mobile). |
| **Desktop connected** | This Mac has completed **Firebase Sign in with Apple** (non-anonymous `User`). | Desktop: Firebase Auth session only. **Does not** imply paid sync or “Sync is on” UI by itself. |
| **Sync is on** (desktop UI) | Desktop shows success in **Enable sync** modal: user is **connected** **and** Firestore confirms **sync unlocked** for that `uid`. | Desktop: `stable && chinottoSyncAccess.active === true` (see §D state 4). |

**Important ordering:**

1. **Entitlement** is decided on **mobile** (purchase / restore / paywall-off).
2. Mobile mirrors **`chinottoSyncAccess.active`** only when Firebase has a **non-anonymous** Apple user (same rules as pushing entries).
3. **Apple sign-in on desktop** only **connects** the Mac; **“Sync is on”** still requires **`chinottoSyncAccess.active`** for that signed-in `uid`.

---

## B. Source of truth

### `users/{firebaseUid}.chinottoSyncAccess`

- **Field:** `active` (boolean), plus `updatedAt` (server timestamp).
- **Writer:** Mobile only — `sync/firestoreSyncAccessMirror.ts` (`mirrorChinottoSyncAccessToFirestore`).
- **When it runs:** After entitlement cache updates (RevenueCat listener), auth changes (`onAuthStateChanged`), and after enable-sync flows (purchase / restore / Sign in with Apple on device).
- **Reader:** Desktop `SyncModal` via `subscribeChinottoUserSyncAccess(uid)` **after** Sign in with Apple.
- **Meaning:** Durable “this Apple/Firebase identity has sync access under current product rules.” Wrong Apple ID on desktop → different `uid` → `active` stays false → no false “Sync is on.”

### `sync_desktop_sessions/{ds}.unlocked`

- **Purpose:** **QR / handoff gate only** — lets **this** desktop modal session know the phone finished unlock **without** the desktop signing in first.
- **Writer:** Mobile — same mirror, **only when** `active === true`, a valid **`ds`** is available (stashed from the opened sync URL), and user is non-anonymous.
- **Reader:** Desktop subscribes with `subscribeDesktopSyncGateSession(sessionId)` **without** auth (requires Firestore rules — see `sync.md` §3).
- **Not** a substitute for `chinottoSyncAccess`: desktop still must read **`active`** after Apple sign-in to show **Sync is on**.

**Timing note (desktop-first):** The gate doc is written in the same mirror pass as the user doc, **after** the user completes **Sign in with Apple on the phone**. Purchase alone (before Apple on device) does **not** run a successful mirror for `ds` (mirror no-ops without a signed-in Firebase user). So the desktop “waiting” state spans paywall + Apple on iPhone.

---

## C. Scenario flows

### C1. Desktop-first

1. User opens **Enable sync** on desktop (`SyncModal`).
2. Desktop generates a new **UUID v4** `sessionId` and shows QR / copy link: `https://getchinotto.app/sync?ds=<sessionId>`.
3. User scans or opens link on iPhone; mobile stashes `ds` and opens the same enable-sync sheet as the header CTA.
4. User completes **Chinotto Pro** (if paywall on) and **Sign in with Apple** on the phone.
5. Mobile calls `mirrorChinottoSyncAccessToFirestore()` → writes `users/{uid}.chinottoSyncAccess.active` (true if entitled) and, with stashed `ds`, `sync_desktop_sessions/{ds}.unlocked: true`, then clears the stash for that `ds`.
6. Desktop listener sets **gate unlocked** → **Continue with Apple** becomes active (state 3).
7. User signs in with the **same** Apple ID → desktop subscribes to `users/{uid}` → **`active === true`** → **Sync is on** (state 4).

### C2. Mobile-first

1. User enables sync on the phone from the **header** (or any `/sync` URL **without** caring about desktop `ds`).
2. Mobile mirrors **`chinottoSyncAccess.active`** only after Apple sign-in + entitlement; **no** `sync_desktop_sessions` write if there was no `ds` in the URL (or stash was cleared after a prior gate write).
3. User later installs/opens desktop and opens **Enable sync**.
4. Desktop’s **new** `sessionId` does **not** match anything the phone will write → **gate stays locked** (state 1–2).
5. User taps **Already finished on your iPhone?** → **bypass gate** (explicit intent, not navigation heuristics).
6. User completes **Continue with Apple** on the Mac → desktop reads **`chinottoSyncAccess.active`** → **Sync is on** if true (state 4).

---

## D. Desktop UI states (`SyncModal`)

Firebase must be configured (`VITE_FIREBASE_*`). If not, modal is still a QR bridge but Apple gating/listeners are inactive (see desktop `firebaseConfig`).

**Layout:** **Continue with Apple** lives in the **left** column (stable slot; disabled + dimmed until gate/bypass). **Right** column is QR + scan caption + “Open on your phone” only. **Footer:** short note (link privacy) + **Already finished…** when not signed in + **Sign out** whenever signed in on the Mac.

| # | State | Conditions (simplified) | What the user sees |
|---|--------|---------------------------|---------------------|
| 1 | **Locked** | Not signed in on Mac, gate not unlocked, bypass off | Left: copy + disabled **Continue with Apple**; right: QR; footer note + **Already finished…** |
| 2 | **Waiting (QR flow)** | Same as 1 | Same UI as locked |
| 3 | **Unlocked, ready to connect** | Gate unlocked (`sync_desktop_sessions`) **or** **Already finished**; not signed in on Mac | **Continue with Apple** enabled |
| 4 | **Connected / Sync is on** | Signed in on Mac **and** `chinottoSyncAccess.active === true` **and** profile snapshot finished loading | **Sync is on** under CTA; footer **Sign out** |
| — | **Signed in, not unlocked** | Signed in on Mac **and** `active !== true` | Left: state lines; CTA disabled; footer **Sign out** |

---

## E. Edge cases & non-goals

| Situation | Expected behavior |
|-----------|-------------------|
| Scan QR, never purchase / never Apple on phone | Mirror does not set gate; desktop stays in 1–2. |
| Purchase on phone, Firestore write fails | Mirror logs in dev; **retries** on next mirror trigger (RC updates, auth events, restore, re-open enable sync). No separate retry queue. |
| Restore purchases on phone | Same mirror path as purchase; desktop later sees `active` after Sign in with Apple on Mac. |
| Had sync before; new desktop | Use **Already finished** → Sign in with Apple → `active` from Firestore. |
| Wrong Apple ID on desktop | `active` false for that `uid` → state “signed in, no access,” not “Sync is on.” |
| Desktop restarted mid-flow | **New** `sessionId` → user must scan **new** QR **or** use **Already finished**; old `ds` doc in Firestore does not auto-pair to the new modal. |
| Mobile restarted mid-flow | Stash is in-memory only → **lost** on process death; user must reopen app via link with `ds` (or complete flow without `ds` and use desktop bypass). Mirror runs again on next auth/RC event. |

**Non-goals / false positives we avoid:**

- **QR scan alone** does not unlock desktop UI.
- **Returning to the desktop app** (focus, no Firestore change) does not unlock.
- **Firebase signed-in on Mac alone** does not show **Sync is on** without **`chinottoSyncAccess.active`.**

---

## F. Implementation map

| Piece | Location |
|-------|-----------|
| Mirror | `chinotto-mobile/sync/firestoreSyncAccessMirror.ts` |
| `ds` parse + stash | `chinotto-mobile/linking/syncDeepLink.ts`, `desktopSyncSessionStash.ts`, `useSyncDeepLink.ts` |
| Modal + listeners | `chinotto-app/src/components/SyncModal.tsx`, `src/lib/desktopFirestoreSync.ts` |
