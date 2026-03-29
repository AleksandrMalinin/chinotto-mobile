# Chinotto Mobile — Apple sync QA checklist

**Scope:** Manual sanity checks for **Sign in with Apple + Firestore** on **iOS** (this repo). Use when validating a build or after auth/sync changes.

---

## 1. Same Apple ID, two devices (iPhone + iPad or iPhone + desktop)

1. Sign in with **the same Apple ID** on both clients (mobile: **Enable sync** → Continue with Apple).
2. Capture a thought on **device A**; within a minute or two (network permitting), confirm it appears in the stream or DB on **device B** (desktop uses the same Firebase `uid` → same `users/{uid}/entries` path).
3. Delete that thought on **device A**; confirm it disappears on **device B** after sync (tombstone listener).

**Expect:** One Firebase user per Apple-linked session; `uid` stable after anonymous → link if you ever had that path.

---

## 2. Reinstall / new install on same iPhone

1. Delete the app, reinstall, open capture.
2. **Enable sync** again with the **same** Apple ID.
3. Confirm prior cloud entries **ingest** over time (recent window via listener; older rows via **backfill** — see [SYNC.md](./SYNC.md)).

**Expect:** Local DB starts empty; cloud data returns without losing the Apple → Firebase mapping if Apple sign-in completes.

---

## 3. `auth/credential-already-in-use`

**When it happens:** This Apple ID was already linked to a **different** Firebase account (e.g. another email/provider flow, or a second device signed in differently). Firebase refuses to **link** the Apple credential to the current user.

**In the app:** You should see calm copy explaining that cloud data may be **split** until you use the **same** Sign in with Apple path everywhere.

**What to do (product / support):**

- Prefer **one** sign-in method per person for cloud: **Sign in with Apple** on all Chinotto clients that should share a library.
- If two Firebase users exist for the same person, fixing it is **account / console** work (out of app v1): pick a canonical user, migrate data, or sign out everywhere and sign in once with Apple only.

---

## 4. Header states (signed in)

| Header | Meaning |
|--------|--------|
| **Checking sync** | Auth persistence restoring. |
| **Syncing…** | Upload queue has pending rows (normal right after capture or offline catch-up). |
| **Sync paused** | Many pending uploads across several checks — often **offline** or repeated errors; open **Sync** sheet for the short note. |
| **Synced** | Signed in and upload queue empty (does not guarantee desktop saw it yet, but push path is clear). |

---

## 5. Related docs

- [SYNC.md](./SYNC.md) — Firestore layout, tombstones, backfill, limits.
- [PRODUCT_STATE.md](./PRODUCT_STATE.md) — current mobile behavior summary.
