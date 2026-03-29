<p align="center">
  <img src="docs/logo.svg" width="80" alt="Chinotto" />
</p>

# Chinotto

*Capture first.  
Revisit later.*

Chinotto Mobile is a minimal companion to Chinotto desktop — built for capturing thoughts the moment they appear, wherever you are.

Thoughts don’t wait for the right place — they appear in passing, between moments, often when you’re away from your desk.  
Capture them instantly — without projects, folders, or workspaces.

Structure can come later — when you revisit on desktop.

Local-first. Works fully offline.  
Your entries stay on your device.

Optional sync keeps your thoughts with you across devices.  
It runs quietly in the background and is never required to capture.

iPhone is the current focus.

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
