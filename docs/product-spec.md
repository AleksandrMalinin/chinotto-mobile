# Chinotto Mobile – Product spec

## Summary

Chinotto Mobile is a minimal companion app for capturing thoughts instantly and syncing them with the desktop experience.

It exists to ensure that thoughts are never lost — regardless of where they occur.

Mobile is not a full thinking environment.  
It is a **capture layer and lightweight recall surface**.

---

## Philosophy

- **Capture instantly, reflect later**
- No friction at the moment of thought (**after** a one-time first-run welcome; see `AGENTS.md`)
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

## Constraints

- Mobile-first capture experience
- Local-first (must work offline)
- Sync with desktop (eventually consistent)
- Single-user
- No collaboration
- **Auth:** optional **Sign in with Apple** + Firebase for cloud sync only — not required for capture (see [`../AGENTS.md`](../AGENTS.md) / [`docs/sync.md`](./sync.md)).
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

- **After first-run welcome:** open app → input is focused as soon as practical (same session: immediately after leaving the welcome screen)
- First install: one-time welcome, then capture — never repeated unless app data reset
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

- Tap widget → opens directly into input
- Input is already focused

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

- No loading states before typing (steady state after welcome)
- No UI decisions required at capture time
- No **recurring** interruptions before input (one-time welcome excepted)

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
- Multi-step flows **for routine use** (beyond the **one-time** welcome on first launch)
- Repeatable onboarding, product tours, or tutorial series (the **single** welcome screen is allowed; see `AGENTS.md`)
- Tutorials **as an ongoing product pattern**
- AI chat
- Feed / recommendations
- Heavy search UI (initially optional)

---

## Future considerations (carefully)

- Voice capture (natural extension)
- Search (minimal)
- Better recall UX

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