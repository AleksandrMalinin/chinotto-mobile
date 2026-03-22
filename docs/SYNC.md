# Chinotto — sync (single reference)

**Scope:** data contract, Firestore transport, mobile implementation pointers, identity decisions, and cross-device philosophy. **Normative for** mobile ↔ desktop `Entry` sync; implementation code lives under `sync/` and `storage/`.

---

## 1. Data contract (`Entry`)

Mobile and desktop MUST use the same shape for sync payloads.

| Field | Type | Meaning |
|--------|------|--------|
| `id` | `string` | Stable unique identifier (e.g. UUID v4). Assigned once at creation. |
| `text` | `string` | User-visible body. Trimmed on mobile at save; ingest stores as received (aside from transport decoding). |
| `createdAt` | `string` | ISO 8601 UTC (e.g. `2025-03-22T12:00:00.000Z`). |

**Invariants:** `id` and `createdAt` immutable; v1 **append-only** (no edit/delete via sync). Globally unique **`id`** for dedupe and ordering tie-break.

### Source of truth

- **Per device:** Local DB (SQLite) is authoritative for UX and capture.
- **Across devices:** **Eventual** consistency.
- **Mobile sync queue:** Operational retry state only — not canonical history.

### Push flow (mobile)

1. Save locally + enqueue (same transaction on mobile).  
2. Background process pushes `Entry` to remote.  
3. Success → mark queue synced; failure → stay **pending** and retry.  
4. **UI MUST NOT** block on network or queue processing.

### Ingest (remote / desktop)

- Accept `Entry` as sent. **Dedupe by `id`:** existing `id` → success, no duplicate row.  
- Insert only when `id` is new. **Never** mutate `id` / `createdAt` on existing rows via ingest.

### Ordering

- Sort by `createdAt`; tie-break by `id` lexicographically.

### Retries

- Same payload may be resent; receiver **must** be idempotent on `entry.id`.

### v1 scope

| In scope | Out of v1 |
|----------|-----------|
| Create / append, dedupe by `id` | Edit sync, delete sync, full conflict resolution |

**Future (non-normative):** desktop → mobile pull, bidirectional sync, stronger auth boundaries.

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
- **Document fields:** `text` (string), `createdAt` (string, ISO UTC).  
- **Writes:** `setDoc` — retries are safe (same doc id and payload).

**Security Rules** (paste in console → Firestore → Rules → Publish):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Indexes:** Single-field `orderBy('createdAt')` on `entries` is often auto-created; add a composite index if the console requests it.

---

## 4. Mobile implementation (this repo)

| Module | Role |
|--------|------|
| `sync/firebaseConfig.ts` | `EXPO_PUBLIC_FIREBASE_*`; `isFirebaseSyncConfigured()`. |
| `sync/firebaseSync.ts` | Firebase app, Firestore (**memory** cache), `getOrInitApp()`, `firebasePushEntry(entry)`. |
| `sync/pushEntryForSync.ts` | `resolvePushEntryForSync()` → Firestore or mock. |
| `sync/syncQueue.ts` / `syncEngine.ts` | Persistent queue, `processSyncQueue`, background interval. |
| `auth/appleFirebaseAuth.ts` | `applyAppleCredentialToFirebase` — anonymous → **`linkWithCredential`**, else **`signInWithCredential`**. |
| `auth/enableAppleSync.ts` | Sign in with Apple (nonce + `OAuthProvider('apple.com')`) + Firebase. |
| `components/EnableSyncModal.tsx` | “Enable sync” / “Continue with Apple” (iOS only). |
| `screens/CaptureScreen.tsx` | “Enable sync” entry when Firebase configured and user not yet on stable (non-anonymous) auth. |
| `App.tsx` | After SQLite init: `startBackgroundSync({ pushEntry })` — **no** auto anonymous sign-in. |

**Stable sync identity:** **Sign in with Apple** (Firebase Auth). Product copy: *Enable sync* / *Continue with Apple* — not “sign up”.

**Anonymous → Apple:** If a session is still **anonymous** (e.g. legacy persistence), **Enable sync** uses **`linkWithCredential`** so the **Firebase `uid` stays the same** and existing `users/{uid}/entries` data stays reachable.

**Push behavior:** `firebasePushEntry` requires a **non-anonymous** user. Anonymous-only sessions must complete **Enable sync** before uploads succeed (queue stays pending until then).

**Edge case:** If Apple is **already linked to a different Firebase user**, `linkWithCredential` can fail with `auth/credential-already-in-use`. The app surfaces a calm error; resolving it may require account tooling later (out of v1 scope).

**Env:** root `.env.example`. **Success:** Firestore write resolves → `markSynced`. **Failure:** leave pending.

**Note:** Prefer **SQLite queue** as the durable retry source; avoid duplicating “pending work” in Firestore offline persistence unless deliberately designed.

**iOS:** `app.json` → `ios.usesAppleSignIn`, plugin `expo-apple-authentication`. **Firebase Console:** enable **Apple** provider (Services ID, key, bundle id per Google docs). **Apple Developer:** Sign in with Apple capability for `com.chinotto.mobile`.

---

## 5. Desktop (separate app)

**Implementation handoff (copy into desktop repo / AI prompt):** [DESKTOP_SYNC_IMPLEMENTATION.md](./DESKTOP_SYNC_IMPLEMENTATION.md)

1. Same Firebase project; same Auth user (`uid`) as mobile for the same person.  
2. Query `users/{uid}/entries` with `orderBy('createdAt', 'desc')` (or `asc` — be consistent).  
3. Recommended: **`onSnapshot`**; polling is acceptable.  
4. Merge into local SQLite: **insert if `id` absent** (primary key / `INSERT OR IGNORE`).

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

## 7. Identity architecture (locked for v1 / v2)

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

## 8. Optional: Firestore vs Realtime DB (historical)

Both support append-only `Entry` and idempotent writes. **Firestore** was chosen for **structured queries**, **ordered desktop reads**, and **rules** on collection paths. Realtime DB stays a possible niche for very small prototypes; not the Chinotto default.

---

## Practical checklist

1. **Console:** Rules (§3); **Authentication** → enable **Apple** (and optional Anonymous only for dev/legacy).  
2. **Mobile:** `.env` from `.env.example`; `npx expo prebuild` / dev build after adding Apple plugin; restart Metro after env changes.  
3. **Desktop:** Same project, same **`uid`**, listener + local merge by `id`.
