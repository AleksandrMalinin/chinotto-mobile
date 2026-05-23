# Sync — desktop & mobile alignment checklist

**Mirror:** `chinotto-app/docs/sync-release-checklist.md` (align **Scope** for platform-only rows).

**Docs:** `chinotto-app/docs/sync.md` (desktop architecture + ops). **Wire contract:** `chinotto-mobile/docs/sync/sync.md`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **✅** | **Done** — true until the code or product changes (update **mobile** `docs/sync/sync.md` or **desktop** `chinotto-app/docs/sync.md` § Changelog when you change behavior). |
| **☐** | **Not done / not verified** — flip to **✅** when satisfied for **this** release (or leave ☐ to mean “still open”). |
| **⭕** | **Optional** — never blocks ship. |

---

## 1. Codebase status — `chinotto-app` (desktop)

*These are **already implemented** in **chinotto-app**. If something regresses, fix the code and update **`chinotto-app/docs/sync.md` § Changelog** — not this table.*

| Item | Status | Notes |
|------|:------:|-------|
| Post–sign-in **backfill** (≤ 40 × 500 docs, `startAfter`, then listeners) | ✅ | `desktopFirestoreSync.ts` |
| Live ingest **`limit(500)`** + tombstone query **`limit(1000)`** + `deletedAt` ordering | ✅ | Same query shape as mobile `sync.md` |
| Tombstone **`getDocs`** backup (sign-in, each ingest snapshot, ~12s poll) + `lastTombstoneQueryDocIds` | ✅ | WKWebView reliability |
| **Suppression** table + **tombstone outbox** + flush with `setDoc` merge | ✅ | SQLite + `entryApi` |
| **`delete_local_entries_for_sync`** IPC: top-level **`entryIds`** (not nested `args`) | ✅ | `chinotto-app/docs/sync.md` § Desktop IPC |
| **Push** after create + **Cmd+Z restore** (`deleteField` on `deletedAt`) | ✅ | `App.tsx` |
| **Push** after local **text** save (detail / stream / unmount flush) + Firestore **`updatedAt`** | ✅ | `syncSavedEntryTextToRemote` + `desktopFirestoreSync.ts` |
| **Push** from menu bar **tray** (`#tray-capture`) when sync on | ✅ | `TrayCapturePanel.tsx` |
| **Ingest** `INSERT` sets **`updated_at`** for new rows from cloud | ✅ | Rust `db/mod.rs` |
| **`normalizeFirestoreCreatedAtForIngest`** (ISO, `Timestamp`, `{seconds}`) | ✅ | `desktopFirestoreSync.test.ts` |
| Vitest + Rust tests for ingest / tombstone / outbox | ✅ | See `chinotto-app/docs/sync.md` § Tests |

### Codebase status — `chinotto-mobile` (mobile)

| Item | Status | Notes |
|------|:------:|-------|
| Phase 2 ingest / tombstone / suppression / `linkWithCredential` | ✅ | `docs/sync/sync.md` §4 |
| **`updateEntryText`** + re-enqueue sync (same `id` / `createdAt`) | ✅ | `storage/entryRepository.ts` |
| In-sheet continuation (**`EntryThoughtSheet`**, save-on-close) | ✅ | `hooks/useEntryContinuation.ts` |
| Push via same queue as create (**`firebasePushEntry`**) | ✅ | `sync/syncEngine.ts` |

---

## 2. Firebase & project (verify every release)

*Console and config — not in git. **☐** = still to confirm; set **✅** when true for the build you ship.*

| Item | Status | Scope | Notes |
|------|:------:|-------|-------|
| Firestore **rules** allow owning user read/write on `users/{uid}/entries/{entryId}` including **`deletedAt`** | ☐ | Both | |
| **Composite index** for tombstone query exists | ☐ | Both | Error URL from console if missing |
| **Apple** provider on; **authorized domains** complete | ☐ | Both | Desktop dev: `localhost`, `127.0.0.1` |
| Desktop **release** build has **`VITE_FIREBASE_*`** set | ☐ | Desktop | CI / notarization pipeline |
| Same **Firebase project** + same **Auth uid** for one user on Mac + phone | ☐ | Both | |

---

## 3. End-to-end behavior (verify every release)

*Manual or staging checks. **☐** until you run them for this release.*

| Item | Status | Scope | Notes |
|------|:------:|-------|-------|
| **Create → other device** (latency OK) | ☐ | Both | |
| **Desktop expands thought → mobile** shows longer **`text`** same `id` (no reorder) | ✅ | Both | Phase 2+ §8.7 — QA verified 2026-05 |
| **Mobile continues thought in sheet → desktop** shows updated **`text`** same `id` | ✅ | Both | Phase 2+ §8.7 — QA verified 2026-05 |
| **Delete → other device** | ☐ | Both | |
| **Local delete** does not resurrect | ☐ | Both | Suppression + tombstone |
| **Undo / restore** still pushes active doc (desktop) | ☐ | Desktop | `deleteField` on `deletedAt` |
| Mobile **anonymous → Apple**: **uid** stable (`linkWithCredential`) | ☐ | Mobile | `sync-apple-qa.md` |
| **Two-device QA** pass | ☐ | Both | Mobile `sync-apple-qa.md`; desktop `chinotto-app/docs/sync.md` § Troubleshooting |

---

## 4. Parity spot-checks (desktop-heavy)

*Implementation is **✅** in §1; here you **confirm** behavior with real data.*

| Item | Status | Scope | Notes |
|------|:------:|-------|-------|
| Account with **>500** remote actives: history appears on Mac after sign-in | ☐ | Desktop | Backfill path |
| Mobile-written entries: **timestamps** look right in stream | ☐ | Desktop | ISO + ordering |
| Limits still match mobile doc (**500** / **1000**) after any sync edit | ☐ | Both | Diff vs `chinotto-mobile/docs/sync/sync.md` |

---

## 5. Optional (⭕ — never blocking)

| Item | Status | Scope | Notes |
|------|:------:|-------|
| **`chinotto-app/docs/sync.md` § Changelog** updated after last desktop sync change | ⭕ | Desktop | |
| **`chinotto-app/docs/sync-release-checklist.md`** mirror of §3 text-edit rows | ⭕ | Desktop | Align when cutting desktop release |
| **`AGENTS.md` / README** link to mobile `docs/sync/sync.md` | ⭕ | Desktop | |
| Unify **`[ChinottoSync]`** vs **`[chinotto sync]`** | ⭕ | Both | |
| E2E automated sync tests | ⭕ | Both | |
| Sunset **`firestore_ingest_suppressed_ids`** | ⭕ | Both | When all clients tombstone-only |

---

## 6. Out of scope (do not block)

- **Concurrent** edits to the same entry on two writers with explicit conflict UX — Phase **2+** is **bidirectional text merge** (desktop + mobile in-sheet continuation) with **last write wins**; see `docs/sync/sync.md` §8.7 and desktop `docs/sync.md` § Limits.  
- Tombstone window **>1000** — rare edge case.  
- Desktop **extra** tombstone `getDocs` vs mobile — intentional.
- **Live refresh inside open `EntryThoughtSheet`** when remote `text` changes — stream updates; sheet body stays on open snapshot until close/reopen.

---

## Summary

| Section | How to read it |
|---------|----------------|
| **§1** | **✅** = already in code (update only if implementation changes). |
| **§2–§4** | **☐** = **not yet verified for this release**; mark **✅** when done. |
| **§5** | **⭕** = polish only. |

**Desktop surfaces:** any new **`create_entry`** path must also **`get_entry` → `pushEntryUpsertToFirestore`** when sync is on, or add a row under §1 when implemented.

**Mobile surfaces:** any new **local text save** path must go through **`updateEntryText`** (or equivalent transaction + re-enqueue) when sync is on.
