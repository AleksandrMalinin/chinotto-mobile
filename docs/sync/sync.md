# Chinotto — sync (single reference)

**Scope:** data contract, Firestore transport, mobile implementation pointers, identity decisions, and cross-device philosophy. **Normative for** mobile ↔ desktop `Entry` sync; implementation code lives under `sync/` and `storage/`.

**Phases**

| Phase | Status | Summary |
|--------|--------|---------|
| **Phase 1** | Shipped (v1) | Append-only create sync; mobile push; desktop ingest by `id` dedupe. No delete over the wire. |
| **Phase 2** | Desktop **shipped**; mobile **shipped** (this repo) | Tombstone `deletedAt`, suppression bridge, tombstone outbox flush, dual `onSnapshot` (ingest + tombstones), swipe/long-press delete. Normative spec **§8**. **Desktop ops / IPC:** `chinotto-app/docs/sync.md`. |
| **Phase 2+ (text)** | Desktop **shipped** (`chinotto-app`); mobile **shipped** (this repo) | Same Firestore doc: desktop **`setDoc` merge** updates **`text`** + **`updatedAt`** after local save; mobile ingest **inserts new ids** and **`UPDATE` local `text`** when the id already exists (read-only capture on mobile; no conflict engine). **§8.7**. |

**Cross-repo docs:** **[Chinotto `docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md)** — desktop architecture, IPC, tombstone/outbox behavior, tests, troubleshooting, and changelog. **This file** (`chinotto-mobile/docs/sync/sync.md`) is the normative **wire** contract (payloads, Firestore layout, **§8**); keep the two aligned when either changes.

---

## 1. Data contract (`Entry`) — Phase 1

Mobile and desktop MUST use the same shape for sync payloads.

| Field | Type | Meaning |
|--------|------|--------|
| `id` | `string` | Stable unique identifier (e.g. UUID v4). Assigned once at creation. |
| `text` | `string` | User-visible body. Trimmed on mobile at save; ingest stores as received (aside from transport decoding). |
| `createdAt` | `string` | ISO 8601 UTC (e.g. `2025-03-22T12:00:00.000Z`). |
| `updatedAt` | Firestore **`Timestamp`** (optional on doc until first desktop save after Phase 2+) | Server time of last **`text`** merge from a writer; used for future LWW; mobile ingest does not persist it in SQLite v1. |

**Invariants:** **`id`** immutable. **`createdAt`** immutable in app logic (writers must not change it on edit). **`text`** may change on the same doc when **Phase 2+** desktop (or future clients) merge updates — §8.7. Globally unique **`id`** for dedupe and ordering tie-break. **Phase 2** adds remote tombstones and delete ops — §8.

### Source of truth

- **Per device:** Local DB (SQLite) is authoritative for UX and capture.
- **Across devices:** **Eventual** consistency.
- **Mobile sync queue:** Operational retry state only — not canonical history.

### Push flow (mobile)

1. Save locally + enqueue (same transaction on mobile).  
2. Background process pushes `Entry` to remote.  
3. Success → mark queue synced; failure → stay **pending** and retry.  
4. **UI MUST NOT** block on network or queue processing.

### Ingest (remote / desktop → mobile)

- **New `id`:** insert row (`INSERT OR IGNORE`); respect suppression (§8.5).  
- **Existing `id`:** **update `text` only** from the active Firestore doc (same `createdAt` in payload; local `created_at` unchanged). **Never** change local `id` / `created_at` via ingest.

### Ordering

- Sort by `createdAt`; tie-break by `id` lexicographically.

### Retries

- Same payload may be resent; receiver **must** be idempotent on `entry.id`.

### Phase 1 scope

| In scope | Out of Phase 1 |
|----------|----------------|
| Create / append, dedupe by `id` | Delete sync (Phase 2), full multi-writer conflict resolution |

**Phase 2 (normative):** cross-device delete via tombstones — §8.

**Future (non-normative beyond Phase 2+):** multi-device **simultaneous** text edits with explicit conflict UX; stronger auth boundaries where not already covered.

---

## 2. Transport (locked)

**Chosen:** **Firebase Cloud Firestore** (existing project). Realtime Database was considered; Firestore fits ordered queries and desktop `onSnapshot` better.

**Not primary v1:** LAN desktop server (fails off-LAN), S3-style relay (extra glue), custom REST API (redundant while Firebase is in use), Supabase (team uses Firebase).

**Avoid:** LAN-only as backbone, heavy CRDT / multi-master v1, premature scaling patterns.

---

## 3. Firestore layout & rules

**Path:**

```text
users/{firebaseUid}/entries/{entryId}
```

- **`entryId`** = `Entry.id`.  
- **Phase 1 document fields:** `text` (string), `createdAt` (Firestore **`Timestamp`** or ISO string from clients; normalize before SQLite).  
- **Phase 2:** optional tombstone field **`deletedAt`** — see §8 (type `Timestamp`, not ISO string in Firestore).  
- **Phase 2+ (text):** optional **`updatedAt`** — Firestore **`Timestamp`**, set with **`serverTimestamp()`** on each desktop merge that updates **`text`** (and clears `deletedAt` when reviving). Mobile listeners treat doc changes like creates for ingest rows; repository applies **insert or text update** per §8.7.  
- **Creates (Phase 1):** `setDoc` — retries are safe (same doc id and payload). **Deletes (Phase 2):** `setDoc` with **`{ merge: true }`** and `deletedAt: serverTimestamp()` (preferred over `updateDoc` alone so missing remote docs still tombstone). Idempotent if already tombstoned.

**Cross-device sync access (desktop gating):**

- **`users/{firebaseUid}`** (optional parent doc): `chinottoSyncAccess.active` (bool) + `updatedAt` — mobile writes when RevenueCat **Chinotto Pro** (or paywall-off) aligns with a signed-in Apple user; desktop reads after Sign in with Apple (same Apple ID → same Firebase uid).
- **`sync_desktop_sessions/{sessionId}`**: `{ unlocked: true, updatedAt }` — mobile writes when access is confirmed and the user opened the app via desktop QR (`?ds=<uuid>`). Desktop listens **without** signing in so the modal can enable **Sign in with Apple** only after unlock.

**Product narrative:** [`cross-device-sync-unlock-flow.md`](./cross-device-sync-unlock-flow.md) (scenarios, UI states, edge cases).

**Security Rules** (paste in console → Firestore → Rules → Publish):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sync_desktop_sessions/{sessionId} {
      allow read: if true;
      allow create, update: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**Troubleshooting — `permission-denied` (desktop):** If the desktop app logs `permission-denied` when polling `sync_desktop_sessions` or `users/{uid}`, the rules deployed in Firebase Console do not match the block above (e.g. missing `sync_desktop_sessions` read, or no rule for the parent `users/{userId}` document). **Publish** the full rules from this section; partial rules that only cover `users/{userId}/entries/...` without the parent `match /users/{userId}` block will block reads of `chinottoSyncAccess` on the user document.

**Indexes:**

- `orderBy('createdAt')` on `entries` (ingest listener) — often auto-created; add a composite if the console requests it (e.g. mixed `createdAt` types).
- **Tombstone listener:** `where('deletedAt', '!=', null)` + `orderBy('deletedAt', 'desc')` + `limit` requires a **composite index** on `deletedAt` (inequality + descending sort). If the listener fails at runtime, check the dev console for **`[ChinottoSync] tombstone snapshot error`** and use the link in the Firebase error to create the index, then restart the app.

**Phase 2 — Rules:** extend so the authenticated user may **update** their entry documents to set **`deletedAt`** (tombstone), in addition to create/read. **Phase 2+:** the same user may **`setDoc` + `merge`** on an existing entry doc to change **`text`** and set **`updatedAt`** (desktop thought continuation); **`createdAt`** must not be changed in client writes. Mobile remains read-only for body edits in v1; no multi-writer conflict rules beyond last merge wins in Firestore.

---

## 4. Mobile implementation (this repo)

| Module | Role |
|--------|------|
| `sync/firebaseConfig.ts` | `EXPO_PUBLIC_FIREBASE_*`; `isFirebaseSyncConfigured()`. |
| `sync/firebaseSync.ts` | Firebase app, Firestore (**memory** cache), `getOrInitApp()`, `firebasePushEntry(entry)`. |
| `sync/pushEntryForSync.ts` | `resolvePushEntryForSync()` → Firestore or mock. |
| `sync/syncQueue.ts` / `syncEngine.ts` | Persistent queue, `processSyncQueue`, background interval; tombstone flush after each tick. |
| `sync/tombstoneOutbox.ts` / `tombstoneFlush.ts` | Durable tombstone outbox (coalesced per `entry_id`); `flushSyncTombstoneOutbox` → Firestore `setDoc` + merge (`deletedAt`). |
| `sync/firestoreSyncAccessMirror.ts` | Mirrors paid sync access to `users/{uid}.chinottoSyncAccess` and optional `sync_desktop_sessions/{ds}` for desktop QR sessions. |
| `sync/ingestSuppression.ts` | `firestore_ingest_suppressed_ids` bridge (local delete until tombstone ack). |
| `sync/firestoreTombstone.ts` | `isFirestoreDocumentTombstoned` for snapshot rows. |
| `sync/firestoreIngest.ts` | `startMobileFirestoreIngest` — `onSnapshot` ingest + remote tombstones; **`runFirestoreIngestBackfill`** paginates `getDocs` after sign-in to load older rows beyond the live snapshot `limit`. |
| `storage/entryRepository.ts` | `deleteEntry`, `applyRemoteTombstoneDeletes`, `ingestRemoteFirestoreRows` (insert new ids **or** `UPDATE` local `text` when id exists — §8.7). |
| `auth/appleFirebaseAuth.ts` | `applyAppleCredentialToFirebase` — anonymous → **`linkWithCredential`**, else **`signInWithCredential`**. |
| `auth/enableAppleSync.ts` | Sign in with Apple (nonce + `OAuthProvider('apple.com')`) + Firebase. |
| `components/EnableSyncModal.tsx` | “Enable sync” / “Continue with Apple” (iOS only). |
| `screens/CaptureScreen.tsx` | Header **Sync** (iOS + configured Firebase); gesture delete; `flushSyncTombstoneOutbox` after local delete. |
| `App.tsx` | After SQLite init: `startBackgroundSync({ pushEntry })` — **no** auto anonymous sign-in. |

### Phase 2 (sync v2) — mobile (this repo)

**Implemented:** `sync_tombstone_outbox` + `firestore_ingest_suppressed_ids` in SQLite; **`deleteEntry`** (suppression + outbox); **`flushSyncTombstoneOutbox`** after delete (capture screen) and on ingest/background tick; **`firebaseApplyTombstoneEntry`** uses **`setDoc` + `merge`** with `deletedAt: serverTimestamp()` (not `updateDoc`, so missing remote docs still get a tombstone and other clients see the delete); **`startMobileFirestoreIngest`** — **two** `onSnapshot` queries on `users/{uid}/entries`: (1) **`orderBy('createdAt', 'desc')` + limit 500** for recent creates/edits ingest (same window as desktop); (2) **dedicated tombstone query** `where('deletedAt', '!=', null)` + **`orderBy('deletedAt', 'desc')`** + **limit 1000** so **new** tombstones are not missed (Firestore’s default sort for `!= null` is ascending; without `orderBy('deletedAt', 'desc')` only the oldest tombstones would fill the limit). **`applyRemoteTombstoneDeletes`** / **`ingestRemoteFirestoreRows`**; background tick runs create queue then tombstone flush. **UX:** swipe or long-press to delete (local-first, no confirmation modal).

**Caveats:** The **createdAt** listener only sees the latest **500** docs by `createdAt`; **tombstones** for older rows still apply via the separate query (up to **1000** newest tombstones). If you have more than 1000 tombstones, raise the limit or add backfill later. **`createdAt` type mixing** may require an extra composite index for the ingest query.

**History backfill:** On each non-anonymous sign-in, **`runFirestoreIngestBackfill`** runs in the background: **`getDocs`** in pages of **500** (`orderBy('createdAt','desc')` + `startAfter`), up to **40** pages (~20k docs). Each page uses **`ingestRemoteFirestoreRows`** (insert new ids **or** update **`text`** for existing ids — §8.7). Overlaps the first snapshot page safely. Stops if the user signs out or the session uid changes.

**Rules:** Authenticated user must be allowed to **update** `deletedAt` on their entry docs (see §3 / §8).

**Stable sync identity:** **Sign in with Apple** (Firebase Auth). Product copy: *Enable sync* / *Continue with Apple* — not “sign up”.

**Anonymous → Apple:** If a session is still **anonymous** (e.g. legacy persistence), **Enable sync** uses **`linkWithCredential`** so the **Firebase `uid` stays the same** and existing `users/{uid}/entries` data stays reachable.

**Push behavior:** `firebasePushEntry` requires a **non-anonymous** user. Anonymous-only sessions must complete **Enable sync** before uploads succeed (queue stays pending until then).

**Edge case:** If Apple is **already linked to a different Firebase user**, `linkWithCredential` can fail with `auth/credential-already-in-use`. The app surfaces explanatory copy (same Apple ID vs one Firebase library per device); full account merge is out of v1 scope — see `docs/sync/sync-apple-qa.md` for manual checks.

**Env:** root `.env.example`. **Success:** Firestore write resolves → `markSynced`. **Failure:** leave pending.

**Note:** Prefer **SQLite queue** as the durable retry source; avoid duplicating “pending work” in Firestore offline persistence unless deliberately designed.

**iOS:** `app.json` → `ios.usesAppleSignIn`, plugin `expo-apple-authentication`. **Firebase Console:** enable **Apple** provider (Services ID, key, bundle id per Google docs). **Apple Developer:** Sign in with Apple capability for `com.chinotto.mobile`.

---

## 5. Desktop (separate app)

**Desktop behavior (architecture, ops, IPC):** [Chinotto `docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md). **This file (`chinotto-mobile/docs/sync/sync.md`)** is the **wire contract** (payloads, Firestore layout, §8 tombstones, mobile module map).

**Shipping / alignment:** [sync-release-checklist.md](./sync-release-checklist.md) — mirrored in `chinotto-app`; update **both** when rows change.

**Implementing or auditing desktop ingest:** use [Chinotto `docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md) (ingest, suppression, tombstones) — no separate prompt doc in this repo.

1. Same Firebase project; same Auth user (`uid`) as mobile for the same person.  
2. Query `users/{uid}/entries` with `orderBy('createdAt', 'desc')` (or `asc` — be consistent).  
3. Recommended: **`onSnapshot`**; polling is acceptable.  
4. **Phase 1 merge:** **insert if `id` absent** (primary key / `INSERT OR IGNORE`).  
5. **Phase 2+ text:** if `id` already exists locally → **update `text`** from snapshot (same doc, expanded on desktop).  
6. **Phase 2:** on snapshot, if doc has **`deletedAt` set** → physical local delete for that `entryId`; suppression bridge until rollout complete — **§8**.

---

## 6. Product philosophy & cross-device identity

**Principles:** No Chinotto accounts / no signup-password product; personal tool; sync connects **your** devices, not a social graph.

**Constraint:** Firebase **anonymous** `uid` is **per install** — phone and desktop do **not** share a namespace until they share a **stable** Auth identity (e.g. Sign in with Apple) or a future pairing model.

### Cross-device strategies (summary)

| Approach | Philosophy fit | Friction | Notes |
|----------|----------------|----------|--------|
| **Pairing / sync key** | Strongest “no account” | One-time pair; recovery harder | Higher engineering (space + rules); deferred. |
| **Magic link email** | Moderate | Inbox step | Firebase-native; good recovery. |
| **Apple / Google (platform)** | Strong if framed as *link devices* | Low (system sheet) | Same Firebase **`uid`** when using same platform account + **account linking** for multiple providers. |
| **Full Chinotto account** | Weak | High | Not a product goal. |

**Near-term recommendation:** **Sign in with Apple** (then Google via **Firebase account linking**), copy: *no Chinotto password — Apple ties your devices.*

**Long-term:** Platform sign-in as default; optional **pairing / recovery key** for users who refuse platform buttons (phase 2+).

---

## 7. Identity architecture (locked; independent of sync Phase 2)

**Decision:** Remote data is keyed by **Firebase Auth `uid`** (not a separate Chinotto id in Firestore):

```text
users/{firebaseUid}/entries/{entryId}
```

**Why now:** Trivial rules (`request.auth.uid == userId`), fast delivery, works with Apple + future Windows (Firebase JS SDK), honest framing as *device linking* not *Chinotto account*.

**Guardrails**

1. **Anonymous `uid`** is not the long-term stable identity for meaningful cross-device cloud data — prefer **Sign in with Apple** (or equivalent) for “real” sync.  
2. Do not leave production data **forever** on anonymous-only auth without an **upgrade path** (link / migrate / export).  
3. Adding **Google** (etc.): use **Firebase account linking** into the **same** user — **one `uid`**, one namespace. Do **not** create a second Firebase user per person.

**Deferred**

- **Internal `chinottoUserId` + provider mapping** — revisit when pairing or non-Firebase binding is priority (needs claims/Functions for safe rules).  
- **`spaces/{spaceId}/entries` (pairing-first)** — revisit when pairing is first-class.

**Re-evaluate this section when:** pairing is a priority without platform sign-in; non-Firebase identity is required; or multiple identity methods **without** Firebase linking are required.

**Next implementation step:** **Desktop:** same Sign in with Apple (or linked Google later) for the same `uid`. **Google on mobile:** use Firebase **account linking** after Apple is stable.

---

## 8. Phase 2 — cross-device deletion (sync v2)

**Status:** normative contract. **Desktop (`chinotto-app`):** **shipped** — see **`chinotto-app/docs/sync.md`** (Desktop implementation, IPC, tests). **Mobile (`chinotto-mobile`):** **shipped** — `sync/firestoreIngest.ts`, `sync/tombstoneFlush.ts`, `storage/entryRepository.ts` (`deleteEntry`, ingest helpers), **§4** above. **Tombstone model only** — hard delete of Firestore documents was rejected. Both apps use **`firestore_ingest_suppressed_ids`** (SQLite) as a **rollout bridge** until all clients honor `deletedAt`.

### 8.1 `deletedAt` contract (Firestore)

| Rule | Detail |
|------|--------|
| **Path** | `users/{uid}/entries/{entryId}` → field **`deletedAt`**. |
| **Canonical type** | Firestore **`Timestamp`** (JS SDK `Timestamp` / native `com.google.firebase.Timestamp`). |
| **Active entry** | Field **absent** or **`null`**. |
| **Deleted (tombstone)** | **Non-null `Timestamp`** — entry is deleted for all UX and list logic. |
| **Writers** | **Must** use **`serverTimestamp()`** (or platform equivalent) for client-initiated tombstones so all devices share one authoritative instant. **Do not** write `deletedAt` as a plain ISO string **in Firestore** — strings are out of contract for v2. |

**SQLite / logs:** any local “when deleted” for debugging is **derived** (e.g. `timestamp.toDate().toISOString()`). That ISO string is **not** the canonical Firestore type.

**Why `Timestamp`:** native Firestore type for rules, indexes, ordering; consistent with `createdAt` handling patterns; avoids string/numeric ambiguity in security rules.

### 8.2 Local SQLite policy (mobile + desktop)

**Choice: physically delete** the row from `entries` when a remote tombstone is applied (and on local user delete, same as today).

**Ingest / snapshot handling:** for doc `entryId`, if `deletedAt != null` → run the same local delete path as user delete (`DELETE FROM entries` for that id; cascades via existing triggers/FKs as on each platform). **Do not** add a `deleted_at` column on `entries` for Phase 2.

**Rationale:** one list/query path without `WHERE deleted_at IS NULL` everywhere; matches “gone from stream”; reuses existing schema.

### 8.3 Delete ordering (user action)

**Order: local delete first → enqueue remote tombstone → async flush.**

1. **Local:** in one DB transaction (or equivalent): remove row from `entries` (and cascades). **During rollout:** if suppression is still used, record `entryId` in `firestore_ingest_suppressed_ids` (desktop) or equivalent bridge on mobile if applicable.  
2. **Queue:** append **`{ "op": "tombstone", "entryId": "<string>" }`** (same id as Firestore doc id and SQLite id).  
3. **Async flush:** worker sends Firestore **`updateDoc`** with **`deletedAt: serverTimestamp()`** (idempotent if already set).

**Rationale:** local-first, instant UI; offline devices hold the op until connectivity; suppression (while enabled) blocks stale active remote docs from reappearing before the tombstone lands.

**Rejected:** remote-first delete (would block or roll back local UX on network failure).

### 8.4 Sync queue — delete payload (normative)

```json
{
  "op": "tombstone",
  "entryId": "<string, same id as Firestore doc id and SQLite id>"
}
```

- **Idempotency:** applying a tombstone twice is valid.  
- **Coalescing:** for Phase 2, do not multiply pending tombstones for the same `entryId` — **one** pending tombstone per `entryId`.  
- **No `deletedAt` in queue payload** — server time is always set at flush via `serverTimestamp()` to avoid clock skew.

**Storage:** implementation-specific (e.g. SQLite outbox on desktop, durable queue on mobile); the **logical** record above is normative.

### 8.5 Suppression table rollout (desktop; bridge)

**Table:** `firestore_ingest_suppressed_ids` (desktop SQLite).

| Phase | Behavior |
|-------|----------|
| **While used** | After **local** delete, until **tombstone flush succeeded** for that `entryId`. Also while **legacy** clients exist that do not write `deletedAt`, so stale active remote docs cannot re-ingest. |
| **Stop writing** | For a given delete: stop suppression updates once tombstone write is **confirmed**. Optionally delete the suppression row for that `entryId` on success. |
| **Remove table** | When (1) all shipped clients write/apply tombstones; (2) no supported path needs suppression; (3) migration or version gate cleared remaining rows — then drop skip-on-suppression ingest logic and the table. |

**Invariant until removal:** ingest must **never** insert a local row for an id that is **suppressed** or **remotely tombstoned**.

### 8.6 Phase 2 implementation checklist (cross-platform)

1. **Rules:** allow authenticated user to set **`deletedAt`** on their `entries/{entryId}` (tombstone updates).  
2. **Listener / ingest:** on doc change, if `deletedAt` set → physical local delete for `entryId`; if active → existing upsert/insert (respect suppression until removed).  
3. **Delete UX:** local delete (+ suppression per rollout) → enqueue §8.4 → background tombstone flush → on success, clear suppression row for `entryId` (desktop).  
4. **Mobile:** same ordering and queue semantics; same Firestore field type.  
5. **Tests:** offline queue replay; tombstone idempotency; mobile tombstone → desktop row gone; desktop delete → mobile applies tombstone; legacy doc without `deletedAt` still ingests as active.

### 8.7 Cross-device **text** updates (thought continuation, Phase 2+)

**Goal:** One entry `id` = one thought. A short capture on mobile can be **expanded on desktop** in the same document; mobile must **show the expanded `text`** after Firestore delivers the change, without turning mobile into a full editor.

| Rule | Detail |
|------|--------|
| **Firestore** | Same path `users/{uid}/entries/{entryId}`. Active docs have **`text`**, **`createdAt`**, optional **`updatedAt`** (`Timestamp`). Tombstone semantics unchanged (**§8.1**). |
| **Desktop (`chinotto-app`)** | After local SQLite text save: **`setDoc` + `merge`** with trimmed **`text`**, preserved **`createdAt`**, **`updatedAt: serverTimestamp()`**, **`deletedAt` cleared**. See **Chinotto `docs/sync.md`**. |
| **Mobile ingest** | `ingestRemoteFirestoreRows`: **`INSERT OR IGNORE`** for new ids; if insert skipped and row not suppressed → **`UPDATE entries SET text = ? WHERE id = ?`**. **`created_at`** is never changed by this path. |
| **Ordering** | Stream order stays by **`created_at`** / `createdAt` (first capture instant), not `updatedAt`. |
| **Conflict** | v1: mobile does **not** edit body text post-capture; if that changes later, compare **`updatedAt`** before overwrite. |

**Security rules:** owner may merge **`text`** / **`updatedAt`** on their entry docs; do not allow changing another user’s `uid` namespace.

---

## 9. Optional: Firestore vs Realtime DB (historical)

Both support append-only `Entry` and idempotent writes. **Firestore** was chosen for **structured queries**, **ordered desktop reads**, and **rules** on collection paths. Realtime DB stays a possible niche for very small prototypes; not the Chinotto default.

---

## Changelog

Record **implementation** and cross-repo **alignment** changes for **mobile** here (do not duplicate the full release matrix — use [sync-release-checklist.md](./sync-release-checklist.md) for ✅ / ☐ per ship).

| Date | Change |
|------|--------|
| 2026-04-13 | **Wire + mobile:** Phase **2+** — Firestore **`updatedAt`** on text merge (desktop); mobile **`ingestRemoteFirestoreRows`** updates local **`text`** when entry id already exists (**§8.7**). Rules: owner may merge `text`/`updatedAt`; `createdAt` unchanged in writers. **Docs:** drop stale `sync-deletion-v2.md` pointers; desktop single source is **`chinotto-app/docs/sync.md`**. |
| 2026-04-12 | **Mobile:** App-update policy via Firebase Remote Config (`@react-native-firebase/app` + `remote-config` + `analytics`, Expo 55). App always tries RC; failures → in-repo mock (`enabled: false`). RC key `chinotto_app_update_json` (string JSON → `UpdateConfig`). **Import template:** [`docs/app-update/firebase-remote-config-template.json`](../app-update/firebase-remote-config-template.json). Requires `GoogleService-Info.plist` / `google-services.json` and native prebuild/EAS. |
| 2026-04-10 | **Mobile:** `startMobileFirestoreIngest` does not run while the Enable sync sheet is open; remote thoughts apply after the sheet closes (capture visible again). **Desktop (`chinotto-app`):** `startDesktopFirestoreIngest` pauses while `SyncModal` is open. **Smoothing:** ~200ms delay after closing the sync sheet before ingest starts; ingest-driven list refreshes are debounced (~120ms) so backfill does not stutter the stream. |
| 2026-04-02 | Cross-device **unlock** mirror + desktop `SyncModal` gating (§3). Doc: [`cross-device-sync-unlock-flow.md`](./cross-device-sync-unlock-flow.md). Mirror clears stashed `ds` after a successful `sync_desktop_sessions` write. |
| 2026-03-29 | Docs: unified release checklist with desktop; removed `desktop-alignment.md` and `desktop-sync-implementation.md`; desktop ingest/ops consolidated in Chinotto [`docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md); this file remains wire contract. |

---

## Practical checklist

1. **Console:** Rules (§3); **Authentication** → enable **Apple** (and optional Anonymous only for dev/legacy). **Phase 2:** extend rules for **`deletedAt`** tombstone updates (§8).  
2. **Mobile:** `.env` from `.env.example`; `npx expo prebuild` / dev build after adding Apple plugin; restart Metro after env changes. **Phase 2:** tombstone queue + `updateDoc` flush per §8.  
3. **Desktop:** Same project, same **`uid`**, listener + local merge by `id`. **Phase 2:** ingest tombstones + suppression bridge per §8. **Ops / IPC / tests:** [Chinotto `docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md).
