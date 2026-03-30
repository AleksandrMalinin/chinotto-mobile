# Chinotto Mobile — AGENTS.md

## Product Context

Chinotto is a minimal thinking tool.

This is NOT a notes app.

Core principles:
- **Instant capture** — On every return visit, the app opens directly into capture (input-first, as soon as boot allows). Nothing may re-introduce a “learning” or setup gate before typing.
- No organization before thinking
- No folders, tags, or categories
- **Minimal friction** — No repeated teaching, no tip-of-the-day, no mandatory tours, and no extra decisions at the moment of capture.

**First run (explicit exception):** A **short, one-time welcome** (`WelcomeOnboardingScreen`, persisted flag) is intentional. It orients the user once; after the user proceeds to capture from that screen, capture is the default forever (until reinstall or dev reset). This is **not** a violation of instant capture — instant capture applies to **steady state** after that first completion.

Mobile app role:
- Capture-first
- Input is the primary UI
- Thinking happens on desktop

**Platform priority (this repo):** **iOS first** — ship-quality UX and sync (Sign in with Apple) target iPhone; **Android parity is deferred**. **Windows and Linux** desktop apps are **planned later** (desktop lives outside this repo). Optional local snapshot: `docs/product/PRODUCT_STATE.md` (gitignored) if you maintain a shipped-behavior checklist.

**Sync documentation:** **Wire contract** — `docs/sync/sync.md` (this repo). **Desktop** implementation and ops — Chinotto repo `docs/sync.md` (https://github.com/AleksandrMalinin/chinotto/blob/main/docs/sync.md). **Ship alignment** — `docs/sync/sync-release-checklist.md`, mirrored in `chinotto-app` (update both when criteria change). Log mobile implementation tweaks in `docs/sync/sync.md` § Changelog.

Golden rule:
> If a feature slows down capturing a thought → do not implement it.

Interpretation for agents: judge **recurring** friction (every open, every new thought). A one-time, non-blocking welcome before first capture is acceptable; anything that **persists** as friction after first use is not.

---

## Package management

- **pnpm** is the only supported package manager for this repo.
- **Do not** use npm or yarn (no `npm install`, `yarn install`, or lockfiles from those tools).

Use:
- `pnpm install`
- `pnpm add <pkg>`
- `pnpm test`

---

## Testing policy (STRICT)

- **Every new feature MUST include tests.**
- Tests must be written **immediately after** implementing the feature (same change set when practical).
- **Jest** is the testing framework.

### Scope

**Unit tests**

- Storage layer: entry repository, DB initialization and queries.
- Sync layer: queue, retry logic (when those modules exist).

**Basic component tests**

- Capture input behavior (e.g. value changes, submit callback).
- Capture / submit flow at the screen level where it adds confidence without brittle UI assertions.

### Avoid

- Snapshot-heavy tests as the main form of coverage.
- Over-testing visual styling or layout pixels.

### Goal

Reliability and safe refactors **without** slowing down iteration.

---

## Tech Stack Rules

### React Native / Expo

- ALWAYS use latest stable Expo SDK
- Do NOT use outdated examples or deprecated APIs
- Prefer Expo-managed or Expo-compatible libraries

Current constraints:
- Expo SDK must support widgets (>= SDK version where widgets are available, e.g. SDK 55+)
- Use modern React Native patterns (functional components, hooks)

---

## Dependency Policy

When choosing libraries:

- Prefer:
  - Actively maintained
  - Expo-compatible
  - Minimal and lightweight

- Avoid:
  - Deprecated libraries
  - Libraries requiring heavy native setup (unless absolutely necessary)
  - Overly complex abstractions

---

## Source of Truth (VERY IMPORTANT)

When generating code or making decisions:

1. ALWAYS prioritize:
   - Official documentation
   - Latest stable APIs

2. NEVER rely on:
   - Old blog posts
   - StackOverflow answers older than 2 years (unless verified)
   - Deprecated patterns

3. If unsure:
   - Explicitly state uncertainty
   - Propose 2 options

---

## Architecture Principles

- Local-first by default
- Offline must always work
- Sync must be async and non-blocking

- Keep architecture:
  - Flat
  - Simple
  - Extendable

Avoid:
- Premature abstractions
- Over-engineered layers
- Complex state management (no Redux unless truly needed)

---

## UX Constraints

**Onboarding (precise):**

- **In bounds:** One-time welcome: single short surface, persisted “seen” flag, then never shown again in normal use. Must hand off to capture immediately after dismiss.
- **Out of bounds:** Repeatable onboarding on launch, multi-screen product tours, version tip carousels, “complete setup” wizards before capture, or any pattern that **regularly** delays input after first-run welcome.

**Still avoid:**

- Tutorial series, feature walkthroughs, or progressive disclosure that fires on every session
- Multi-step UX for **routine** capture (not the one-time welcome)
- Unnecessary buttons

**Input (on capture screen, including after welcome):**

- Immediately focused on open
- No avoidable delay before typing
- Central element

---

## Sync Philosophy

- Save locally first
- Sync later
- Never block UI

---

## Explicit Non-Goals

Do NOT implement:

- Folders
- Tags
- Categories
- Complex editing UI
- Settings screens (unless critical)

---

## Code Expectations

- Clean, readable code
- No unused abstractions
- Minimal dependencies
- Clear separation of concerns (UI / storage / sync)

---

## Red Flags (Stop and reconsider)

If you are about to implement:

- Navigation stacks
- Complex global state
- Multiple screens for simple flows (beyond the **single** one-time welcome already shipped)
- Heavy UI components

→ STOP and propose a simpler alternative

---

## Behavior Expectations for Agent

When generating solutions:

- Prefer simplest working version
- Explain tradeoffs briefly
- Avoid overbuilding

If something feels overcomplicated:
→ suggest a simpler version

---

## Version Awareness

Before implementing:

- Ensure compatibility with latest Expo SDK
- Verify APIs are current
- Avoid deprecated packages

If a feature requires a specific SDK version:
→ explicitly mention it

---

## Final Principle

Chinotto is about reducing friction, not adding features.

Every decision must protect:
- speed
- simplicity
- clarity
