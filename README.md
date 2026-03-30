<p align="center">
  <img src="docs/engineering/logo.svg" width="80" alt="Chinotto" />
</p>

# Chinotto

*Capture first.  
Revisit later.*

Chinotto Mobile is a minimal companion to Chinotto desktop — built for capturing thoughts the moment they appear.

Capture them instantly — without projects, folders, or workspaces.  
Structure can come later — when you revisit on desktop.

Local-first. Works fully offline.  
Your entries stay on your device.

Optional sync (with Apple ID) keeps your thoughts with you across devices.

---

## Run locally

Prerequisites: Node.js, pnpm, Xcode (for iOS simulator or device).

```bash
pnpm install
pnpm start
```

Open in Expo Go or a dev client, or run:

```bash
pnpm ios
pnpm android
```

## Stack

- Expo (React Native)
- TypeScript
- SQLite (`expo-sqlite`)
- Firebase (optional, for sync)

## Core behavior

- **Capture** — open and start typing
- **Stream** — recent thoughts in reverse chronological order
- **Search** — find thoughts by text
- **Share in** — capture from other apps
- **Sync** (optional) — keep thoughts in sync across devices

## Related

- [Chinotto desktop](https://github.com/AleksandrMalinin/chinotto) — primary thinking surface
- [Chinotto web](https://github.com/AleksandrMalinin/chinotto-web) — web companion / info site

**Sync docs (this repo):** [docs/sync/sync.md](docs/sync/sync.md) — Firestore wire contract for mobile ↔ desktop. **Desktop app** (ingest, IPC, troubleshooting): [Chinotto `docs/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md). **Release checklist:** [docs/sync/sync-release-checklist.md](docs/sync/sync-release-checklist.md) (keep in sync with the desktop copy).
