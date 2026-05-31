# Architecture

High-level overview of the Chinotto mobile app.

## Stack

- **Expo (React Native)** — iOS app shell
- **TypeScript** — UI and business logic
- **SQLite (`expo-sqlite`)** — local storage and search

## Data model

One entity: **Entry** — `id`, `text`, `createdAt` (ISO 8601 UTC).

Same shape as desktop. Append-only capture; no folders or documents.

## Local-first

SQLite on your device is the source of truth for capture and search. Entry text is not sent to analytics.

**Optional sync:** when Firebase is configured and you sign in with Apple, entries can sync with Chinotto desktop. Not required for core use.

## Project layout

```
components/   UI (capture, stream, search)
screens/      Capture and settings flows
storage/      SQLite entry repository
sync/         Background Firestore push/pull
docs/         Public documentation
docs/internal/ Maintainer and implementation docs
```

## Capture and sync

The UI saves entries locally first. Sync runs in the background and never blocks typing.

## Updates

Production builds check the App Store for updates. An in-app update screen may appear when a newer version is available (Firebase Remote Config policy).

## More detail

Implementation notes, sync wire contract, product spec, and contributor conventions live in [`docs/internal/`](internal/README.md) (not linked from the main README).
