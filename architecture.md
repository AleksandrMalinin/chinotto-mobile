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
Remote / Desktop sync (future)
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
- Optionally show recent entries

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

### Behavior

- Entry saved locally
- Added to sync queue
- Background process tries to sync

### Conflict strategy (v1)

- Append-only → no conflicts
- Later: dedupe by id

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

## Networking (future)

Not required for v1.

But design should support:

- REST or WebSocket sync
- Eventually consistent model
- Retry logic

---

## Module Boundaries

```
storage/
  db.ts
  entryRepository.ts
sync/
  syncQueue.ts
  syncEngine.ts
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
