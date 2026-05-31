# Chinotto Mobile – Architecture

## Principles

- Local-first always
- Sync is async and non-blocking
- Minimal layers, no overengineering
- Single entity model (Entry)
- UI must never depend on network

---

## System Overview

The system consists of 3 core layers:

1. UI Layer (React Native)
2. Local Storage Layer
3. Sync Layer (background)

```
UI (Capture Screen)
↓
Local Storage (source of truth)
↓
Sync Engine (async, optional)
↓
Remote (optional Firestore — same contract as desktop)
```

---

## Data Model

### Entry

```ts
type Entry = {
  id: string
  text: string
  createdAt: string // ISO UTC
}
```

**Rules:**

- Immutable (no updates in v1)
- Append-only
- Sorted by `createdAt` DESC

---

## Storage Layer

### Choice

**Use:**

- **SQLite (`expo-sqlite`)** → preferred for flexibility  
  **OR**
- **MMKV** → if ultra-simple + faster startup needed

**Recommended:** SQLite (closer to desktop model, easier sync later)

### Responsibilities

- Persist entries locally
- Provide fast read/write
- Never block UI

### API

- `saveEntry(text: string): Promise<Entry>`
- `getRecentEntries(limit: number): Promise<Entry[]>`
- `getEntriesOlderThan(cursor, limit): Promise<Entry[]>` — cursor pagination (newest-first)
- `searchEntriesByText(needle, limit?): Promise<Entry[]>` — substring, case-insensitive (delegates to recall search)
- `searchEntriesForRecall(needle, limit?)` — same query + `truncated` when more than `limit` rows exist
- `getAllEntries(): Promise<Entry[]>`

### Behavior

- Writes must be instant
- Reads must be fast (indexed)
- No complex queries in v1

---

## UI Layer

### Structure

```
/components
  CaptureInput.tsx
  RecentList.tsx

/screens
  CaptureScreen.tsx
```

### CaptureScreen responsibilities

- Render input
- Handle submit
- Trigger `saveEntry`
- Recent stream (paged) + **stream search** (`searchEntriesForRecall` on local DB)

### Critical rule

**UI must not wait for storage or sync**

---

## Sync Layer

### Philosophy

- Best-effort
- Invisible
- Never blocks user

### v1 Implementation

**Minimal:**

- `enqueueForSync(entry: Entry)`
- `processSyncQueue()`
- Optional **Firebase (Firestore)** push when `EXPO_PUBLIC_FIREBASE_*` is set — see [sync/sync.md](sync/sync.md)

### Behavior

- Entry saved locally
- Added to sync queue
- Background process tries to sync

### Conflict strategy (v1)

- Append-only → no conflicts
- **Remote ingest (when implemented) must dedupe by `Entry.id`.** Retries can resend the same entry; the server (or desktop receiver) should treat duplicate ids as no-ops.

### Future-ready design

Prepare for:

- push (mobile → desktop)
- pull (desktop → mobile)

---

## Sync Queue

**Simple structure:**

```ts
type SyncItem = {
  id: string
  type: 'entry'
  payload: Entry
  status: 'pending' | 'synced'
}
```

**Storage:** local DB table or JSON store

---

## Networking

**v1 (optional):** Firestore `setDoc` from the sync queue ([sync/sync.md](sync/sync.md)). Capture stays local-first; network is background-only.

**Future:** pull, other transports — eventually consistent model, retry logic (SQLite queue already retries push).

---

## Module Boundaries

```
storage/
  db.ts
  entryRepository.ts
auth/
  appleFirebaseAuth.ts
  enableAppleSync.ts
sync/
  syncQueue.ts
  syncEngine.ts
  firebaseConfig.ts
  firebaseSync.ts
  pushEntryForSync.ts
ui/
  components
  screens
```

---

## Anti-patterns (avoid)

- Global state managers (Redux, MobX)
- Complex caching layers
- Tight coupling UI ↔ sync
- Blocking async flows in UI

---

## Performance rules

- Input must be instant
- Save must feel synchronous
- No re-renders on every keystroke
- List rendering must be lightweight

---

## Offline guarantees

- App must fully work without internet
- All entries must persist locally
- Sync happens later

---

## Evolution path

| Phase | Scope |
|-------|--------|
| **v0.1** | Local storage only; capture + recent |
| **v0.2** | Basic sync (manual or mocked) |
| **v0.3** | Real sync engine |
| **v1** | Cross-device consistency |

---

## Final principle

**Storage is the source of truth**  
**Sync is a side effect**
