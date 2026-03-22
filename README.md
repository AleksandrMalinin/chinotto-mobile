# Chinotto Mobile

Expo (React Native) app. See `AGENTS.md` and `product-spec.md` for product rules.

Typography matches desktop: **Open Sauce One** 400 / 500 (`.ttf` in `assets/fonts/`, loaded in `App.tsx`). **Inter 300** is desktop intro-only; not loaded on mobile unless we add an intro screen.

Background: `AmbientBackground` (stacked `expo-linear-gradient` orbs + atmosphere + bottom vignette; ~20s opacity pulse).

Brand (aligned with `chinotto-app`): **`ChinottoLogo`** (`react-native-svg`) uses the same geometry as desktop (`src/components/ChinottoLogo.tsx`). Optional **animated** intro replicates web stroke draw / dot stagger / breathe timings from `index.css`. **`IntroBlobField`** mirrors intro blob colors (violet / cyan / orange drift).

**Cold start (everyone):** after fonts + DB, native splash hands off to **`BrandSplash`** — animated **`ChinottoLogo`** + shell (`AmbientBackground`, **`IntroBlobField`**).

**First launch (after that):** **`WelcomeOnboardingScreen`** with **`StreamFlowPanel`** (see `chinotto-app/docs/stream-flow-panel-animation.md`) and the same headline copy as desktop empty-stream onboarding. **Continue** sets `@chinotto/welcome_v1` and opens capture.

**Returning visits:** same **`BrandSplash`** loading beat, then capture (no welcome). Header: **32px** logo like the desktop app bar.

In **`__DEV__`**, long-press the **header logo** → **Dev menu** → **Reset welcome onboarding** (clears the flag and runs **BrandSplash** again, then welcome). Production builds omit this.

## Setup

This repository uses **pnpm** only.

```bash
pnpm install
pnpm start
```

## Tests

```bash
pnpm test
pnpm test:watch
```
