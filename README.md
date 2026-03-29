<p align="center">
  <img src="assets/icon.png" width="80" alt="Chinotto" />
</p>

# Chinotto Mobile

*Capture first.  
Revisit later.*

Chinotto Mobile is a **minimal capture companion** for the moment a thought appears — without folders, tags, or workspaces.

It pairs with the **Chinotto desktop** thinking surface (separate repo): you capture on the phone, reflect in depth on the machine. **Structure can wait** until you revisit.

**Local-first.** Entries live in **SQLite** on the device. The app works fully offline.

**Optional cloud sync.** When you enable **Sign in with Apple** and ship with Firebase configured (`EXPO_PUBLIC_FIREBASE_*`), thoughts can sync to the same Firestore space as desktop. Sync is a **background layer**, not a setup gate. Without those env vars, the app stays local-only.

**iOS-first today.** Ship-quality UX and sync entry points target **iPhone**; Android parity is planned later.

---

## Run locally

**Prerequisites:** Node.js, **pnpm**, Xcode (for iOS simulator / device).

```bash
pnpm install
pnpm start
```

Then open in Expo Go or a dev client, or run `pnpm ios` / `pnpm android` after a native prebuild if you use `expo run:*`.

**Icons / raster assets:** `pnpm run generate:icons` (see `scripts/generate-app-icons.mjs`).

---

## Stack

- Expo (React Native)
- TypeScript
- SQLite (`expo-sqlite`)
- Optional Firebase (Auth + Firestore) for sync

---

## Core behavior

- **Capture** — one screen; save is immediate; input stays central.
- **Stream** — recent thoughts, reverse chronological; load more as you scroll.
- **Search** — lightweight full-text recall over local entries (same DB as the stream).
- **Share in** — save text / links shared from other apps.
- **First launch** — short welcome once, then capture stays the default.
- **Widget (iOS)** — optional home-screen capture shortcut (see `app.config.js` / `EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET` for release builds).

**Sync (when configured)** — queue + background upload; Firestore ingest + tombstones for cross-device deletes; honest header states on iOS (**Checking / Syncing / Sync paused / Synced**).

---

## Tests

```bash
pnpm test
pnpm test:watch
```

---

## Related

- **Chinotto desktop** — primary thinking surface; same optional Firestore contract when sync is on.
- Package manager for this repo is **pnpm only** (no npm / yarn lockfiles).
