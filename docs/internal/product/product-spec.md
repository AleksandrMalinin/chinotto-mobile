# Chinotto Mobile – Product spec

## Summary

Chinotto Mobile is a minimal companion app for capturing thoughts instantly and syncing them with the desktop experience.

It exists to ensure that thoughts are never lost — regardless of where they occur.

Mobile is not a full thinking environment.  
It is a **capture layer and lightweight recall surface**.

This document covers both:
- product intent and guardrails
- current shipped behavior on `main` (high level)

---

## Philosophy

- **Capture instantly, reflect later**
- No friction at the moment of thought (after a brief brand splash; see `AGENTS.md`)
- No organization on mobile
- Desktop is for depth, mobile is for immediacy

---

## Product role

Chinotto is a single system with two surfaces:

### Desktop
- Thinking
- Reading
- Reflection
- Context recovery

### Mobile
- Capture
- Quick recall
- Ubiquitous access

---

## Current shipped scope (`main`)

This section is the "what exists now" snapshot for first-time readers.

- **Capture-first shell:** brief brand splash, then direct capture state
- **Capture input:** fast add flow with local-first persistence
- **Recent stream:** lightweight reverse-chronological recall surface
- **Search:** text search over entries
- **Share in (iOS):** capture text from other apps via share extension
- **Optional sync:** Sign in with Apple + Firebase-backed sync (capture does not depend on auth)
- **Widget path (iOS):** home widget entry point into quick capture
- **Update policy gate:** Remote Config-driven app-update screen support (soft/forced modes)
- **Monetization plumbing:** RevenueCat integration and entitlement sync flows

Platform status:
- **iOS is primary and shipping target**
- Android parity is deferred

---

## Constraints

- Mobile-first capture experience
- Local-first (must work offline)
- Sync with desktop (eventually consistent)
- Single-user
- No collaboration
- **Auth:** optional **Sign in with Apple** + Firebase for cloud sync only — not required for capture (see [`../../AGENTS.md`](../../AGENTS.md) / [sync/sync.md](../sync/sync.md)).
- No cloud dependency required for **core** capture UX (sync is optional).

---

## Proposal guardrails

Chinotto Mobile is **not**:

- A notes app
- A document editor
- A productivity tool
- A knowledge base

Do not introduce:

- Folders
- Tags
- Categories
- Workspaces
- Dashboards
- Complex editing tools
- Feed-like discovery

All improvements must preserve:

1. Instant capture (<3 seconds)
2. Zero decision-making at write time
3. Minimal UI
4. Single entity model (Entry)

---

## Success metric

> The app should feel like **a pocket for thoughts**, not a place to manage them.

---

## Core flows

### 1. Capture (primary)

- **After brand splash:** open app → input is focused as soon as practical
- First install: same steady state — brand splash, then capture
- Keyboard is open
- User starts typing instantly
- Press Enter / Done → entry is created
- Input clears automatically

No confirmations  
No save buttons (or extremely subtle)  
No navigation

---

### 2. Quick recall (secondary)

- User can see recent thoughts (last ~10–20)
- Lightweight scrolling only
- No heavy metadata or UI

Purpose:
- quick context glance
- not deep reading

---

### 3. Widget capture (critical extension)

- iOS home widget supports **Small / Medium / Large** families
- Widget keeps the same capture-first contract:
  - header/action area opens capture (`chinotto://capture`)
  - thought rows open the selected thought (`chinotto://thought/<id>`)
- Input is focused as soon as boot allows after launch from widget

Ideal (if supported):
- Inline capture directly in widget

---

### 4. Sync

- Entries are saved locally first
- Synced asynchronously with desktop
- Sync never blocks capture

User should feel:
> “This thought is safe”

---

## UX principles

### 1. Input-first

The input is the product.

Everything else is secondary.

---

### 2. Zero friction

- No loading states before typing (steady state after brand splash)
- No UI decisions required at capture time
- No **recurring** interruptions before input

---

### 3. Ephemeral feel

- Thoughts are captured and disappear
- No sense of managing content

---

### 4. Calm interface

- No visual noise
- No feature density
- No cognitive overhead

---

## Data model

Same as desktop.

### Entry

| Field       | Type   |
|------------|--------|
| id         | string |
| text       | string |
| created_at | string |

No additional structure.

---

## Not in mobile (explicitly)

- Folders / tags
- Complex editing
- Multi-step flows **for routine use** (beyond brand splash → capture)
- Repeatable onboarding, product tours, or tutorial series (see `AGENTS.md`)
- Tutorials **as an ongoing product pattern**
- AI chat
- Feed / recommendations
- Heavy search UI (initially optional)

---

## Future considerations (carefully)

- Voice capture (natural extension)
- Better recall UX — see [`temporal-navigation.md`](temporal-navigation.md) (month scrubber + temporal map sheet; in progress) and [`spatial-navigation.md`](spatial-navigation.md) (Echo layer; dev prototype)

All must pass:

> Does this help capture or lightly recall without adding friction?

---

## Relationship with desktop

Mobile should never replace desktop.

Instead:

> Mobile captures  
> Desktop understands

---

## Final principle

Chinotto Mobile exists to protect one moment:

> the moment a thought appears

Everything else is secondary.