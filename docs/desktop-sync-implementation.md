# Desktop app — Firestore sync implementation spec (prompt-ready)

**Purpose:** Hand this document to an AI assistant or developer implementing **read-side sync** in the **Chinotto desktop** codebase. It matches **Chinotto Mobile** (this repo) behavior and [sync.md](./sync.md).

**Mobile reference repo:** `chinotto-mobile` — Firebase + Sign in with Apple + `firebasePushEntry` → `users/{uid}/entries/{entryId}`.

---

## Goal

- After the user signs in with **the same identity as on mobile** (same **Firebase Auth `uid`**), the desktop app **ingests** entries from Firestore into **local SQLite** (desktop remains **local-first**).
- **No Chinotto accounts** — product copy is **device linking** (e.g. “Enable sync” / “Continue with Apple”), not signup/login.
- **Phase 1 (v1):** **append-only**, **create-only** ingest from cloud. No edit/delete sync, no bidirectional push from desktop in this spec unless you explicitly extend scope.
- **Phase 2 (sync v2):** cross-device **tombstone** deletion — normative contract **[sync.md §8](./sync.md)**; desktop **shipped** (see `chinotto-app/docs/sync-deletion-v2.md` → **Desktop implementation**). Mobile handoff: same file → **Mobile implementation**.

---

## Non-goals (Phase 1)

- Google sign-in, email auth, pairing codes, internal `chinottoUserId` layer, sync-space model.
- Moving **source of truth** to Firestore — **SQLite stays authoritative** on desktop.
- Blocking the main capture/editor UI on network or auth.

---

## Canonical `Entry` (must match mobile)

```ts
type Entry = {
  id: string;        // UUID, immutable, global dedupe key
  text: string;
  createdAt: string; // ISO 8601 UTC
};
```

**Ingest rule (Phase 1):** For each remote document, if `id` **already exists** locally → **skip** (idempotent). Else **insert** row with `id`, `text`, `createdAt`. Never overwrite `id` / `createdAt` for an existing row from sync.

**Ingest rule (Phase 2 — sync v2):** If the remote document has **`deletedAt`** set (non-null Firestore `Timestamp`), **delete** the local SQLite row for that `id` if it exists (physical delete); **do not** insert from that snapshot. If `deletedAt` is absent or null, apply the Phase 1 rule above. Normative detail: **[sync.md §8](./sync.md)**.

**Ordering (display):** `createdAt` descending (newest first) to align with mobile; tie-break by `id` lexicographically.

---

## Firestore path (locked)

```text
users/{firebaseUid}/entries/{entryId}
```

| Piece | Value |
|--------|--------|
| `firebaseUid` | `auth.currentUser.uid` after sign-in (**must match mobile** for the same person). |
| `entryId` | Same as `Entry.id` (document id in Firestore). |
| Document fields | **Phase 1:** `text: string`, `createdAt: string` (ISO UTC). **Phase 2:** optional `deletedAt` (`Timestamp`) — [sync.md §8](./sync.md). |

**Security rules:** Same as mobile — see **[sync.md §3 — Firestore layout & rules](./sync.md#3-firestore-layout--rules)** (paste-ready snippet). Reads require **`request.auth.uid == userId`**, so the client must query **`users/{currentUser.uid}/entries`**.

---

## Firebase project configuration

- Use the **same Firebase project** as mobile (`projectId`, Web app config: `apiKey`, `authDomain`, `appId`, etc.).
- **Auth domain** example: `https://<project-id>.firebaseapp.com` — OAuth return URL often includes `__/auth/handler` (Firebase console documents this when enabling Apple).

---

## Authentication (critical for cross-device)

**Requirement:** Desktop must obtain the **same Firebase `uid`** as the phone for the same human.

**Recommended v1:** **Sign in with Apple** via **Firebase Authentication**, same as mobile.

- **macOS / native WebView:** Use platform + Firebase JS SDK patterns supported for your stack (e.g. Electron with custom protocol, or web `signInWithPopup` / `signInWithRedirect` with Apple provider where applicable).
- **Web / PWA desktop:** Firebase [Apple provider](https://firebase.google.com/docs/auth/web/apple) (popup or redirect) + same Firebase project.
- **Future Google:** Use **[account linking](https://firebase.google.com/docs/auth/web/account-linking)** so **one `uid`** is preserved — do **not** create a second Firebase user for the same person.

**Product copy (align with mobile):**

- Title: **Enable sync**
- Primary action: **Continue with Apple**
- Supporting: *Use Apple to connect your devices.* / *Chinotto does not create its own account.*
- Avoid: “Sign up”, “Create account”, “Profile”, “Account settings” unless strictly necessary.

**Anonymous auth on desktop:** Not required for v1. If present for dev only, do **not** treat it as stable cross-device identity — user should complete Apple sign-in for real sync.

---

## Firestore read path (implementation)

1. Initialize Firebase **App** + **Auth** + **Firestore** (same config as mobile Web app).
2. After `onAuthStateChanged` (or equivalent) shows `currentUser` and **`!user.isAnonymous`** (if you mirror mobile’s “stable sync” rule):
   - Build collection reference: `collection(db, 'users', uid, 'entries')`.
   - Query: **`orderBy('createdAt', 'desc')`** (match mobile list semantics; use `asc` only if you reverse in UI consistently).
3. Subscribe with **`onSnapshot`** (preferred) or poll with `getDocs` on an interval.
4. On each snapshot, for each doc:
   - `const entry = { id: doc.id, text: data.text, createdAt: data.createdAt }`.
   - **Merge into SQLite:** insert-if-new by primary key `id`; ignore duplicates.

**Performance:** For large histories, add **`limit()`** and/or **pagination** (`startAfter`) in a later iteration; v1 can start with a reasonable limit (e.g. 100–500) if needed.

**Errors:** Network / permission errors must **not** crash the app; keep local data usable; log in dev.

---

## Optional: desktop → cloud (out of this spec)

Mobile already **pushes** with `setDoc`. If desktop creates entries locally later, use the **same** path and fields and rely on **idempotent** `setDoc` by `entryId`. Coordinate in a separate task to avoid scope creep.

---

## Verification checklist

1. Sign in on desktop with Apple → Firebase `uid` equals mobile’s `uid` for the same Apple ID (check Firebase Console → Authentication → Users).
2. Firestore **Data** tab shows `users/{uid}/entries/{entryId}` with `text` / `createdAt`.
3. After snapshot, desktop SQLite contains new rows with matching `id`.
4. Duplicate snapshot deliveries do **not** duplicate SQLite rows.

---

## Reference

- Full product + identity decisions: [sync.md](./sync.md) in **chinotto-mobile**.
- Mobile push implementation: `sync/firebaseSync.ts`, `auth/enableAppleSync.ts`, `auth/appleFirebaseAuth.ts`.

---

## One-line instruction for an AI prompt

> Implement Chinotto desktop sync: same Firebase project as mobile; Sign in with Apple via Firebase Auth until `auth.currentUser.uid` matches the user’s mobile session; subscribe to Firestore `users/{uid}/entries` ordered by `createdAt` desc; map each doc to `Entry { id: doc.id, text, createdAt }` and insert into local SQLite only if `id` is new; keep SQLite source of truth; use copy “Enable sync” / “Continue with Apple”; no Chinotto account system; v1 append-only ingest from cloud.
