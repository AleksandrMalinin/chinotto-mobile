# Development

## Prerequisites

- Node.js
- pnpm
- Xcode (iOS simulator or device)

## Run

```bash
pnpm install
pnpm start
```

Open in Expo Go or a dev client, or run:

```bash
pnpm ios
pnpm android
```

## Test

```bash
pnpm test
```

Jest covers storage, sync helpers, and key UI flows.

## Build

iOS releases ship via App Store / TestFlight (EAS or native `ios/` project in this repo).

When bumping marketing version or build number for store submission, update `app.json` and `ios/Chinotto/Info.plist` together (`CFBundleShortVersionString` and `CFBundleVersion`).

## Contributing

- Product scope and agent contract: [`AGENTS.md`](../AGENTS.md)
