# Spatial navigation (mobile)

Product and implementation plan for **adjacent mental layers** beside the capture stream — without tabs, folders, or PKM chrome.

**Status:** Echo recall ships as **home depth strip** under the composer (`ECHO_LAYER_ENABLED = true`). Temporal orientation — [`temporal-navigation.md`](temporal-navigation.md). Continuity mechanics — [`echo-continuity-exploration.md`](echo-continuity-exploration.md).  
**Related:** [`product-spec.md`](product-spec.md), [`../../AGENTS.md`](../../AGENTS.md).

---

## Problem

The stream is an infinite reverse-chronological list. As history grows:

- Users lose **attention context** — what still pulls on them vs what merely passed.
- A single vertical feed cannot express **memory drift** or **gravity** without becoming a notes manager.
- Horizontal “surfaces” in consumer apps usually become **tabs, dashboards, or feeds** — wrong register for Chinotto.

We need **quiet recall beside capture**, without write-time decisions or organization primitives.

---

## Product thesis

> Spatial navigation is **orientation of attention**, not **organization of content**.

The user should feel: **“something is still here with me”** — not **“the app sorted my notes.”**

### Core challenge

Evolve beyond “infinite feed of thoughts” **without** becoming a note organization system.

**Answer:** grow along **time** (temporal nav — in-stream) and **attention** (Echo — depth under composer), not **structure** (folders, tags, graphs).

---

## System (two axes, not four tabs)

| Axis | Surface | Metaphor | Status |
|------|---------|----------|--------|
| **Vertical / in-stream** | Month rack + temporal map sheet | “Where am I in time?” | Shipped — see [`temporal-navigation.md`](temporal-navigation.md) |
| **Depth / under composer** | **Home depth recall** (one card) | “What still echoes?” | Shipped |

**Do not stack:** bottom tabs + multiple horizontal pages + temporal sheet + search filters. Maximum navigation complexity while staying calm: **stream + search + temporal overlay + optional recall strip**.

```
[ Composer ]
[ Echo recall card ]   ← optional, one slot
[ Stream … ]
        ↑
 temporal rack / map (overlay on stream only)
```

---

## Echo recall (home depth)

### Role

Sparse **memory drift** surface — desktop `MemoryEcho` parity:

| Signal | User feeling | Echo copy hint |
|--------|--------------|----------------|
| **Gravity** — revisits, edits | “Still here” | Whisper: *Still here* |
| **Drift** — old, long-unseen | “From earlier” | Whisper: *From last week* / *From earlier* |

Not: recommendations, AI feed, favorites, pins, or “related thoughts” UI.

### In bounds

- **One card** under composer when eligible — no horizontal pager, no swipe-to-Echo page.
- Tap card → `EntryThoughtSheet` (Resume).
- Dismiss × hides candidate for session; cooldown prefs apply across sessions.
- Local-only **engagement signals** (`open_count`, `edit_count`, `last_opened_at`).
- Selection uses silent scoring + salted shuffle — **never explain “why”** to the user.
- Hidden when search/read sheet/draft/voice active, or when candidate is already in top-5 stream rows.

### Out of bounds

- Tab bar, page dots, horizontal Echo page.
- Graph / orbit / cluster visualization.
- Connected-thought **surface** as recall (trail dots + peel + sheet rail only).
- Full-bleed **Horizon** timeline page (duplicates temporal map).

---

## UX principles (Chinotto-specific)

1. **Stream is home** — app open lands on stream; recall is optional depth.
2. **Capture-first** — composer fixed; recall hides during search and read sheet.
3. **Gesture separation** — thread peel = swipe **right** on linked row; delete = swipe **left** on row.
4. **Calm copy** — one whisper line max on recall card; no algorithm language.
5. **Temporal stays in-stream** — do not horizontalize the timeline.
6. **Trail links are precise** — keyword overlap ≥2 (desktop rule); no prefix-only linking.

---

## Gesture model (stream)

| Gesture | Result |
|---------|--------|
| Swipe **right** on dotted row | Reveal one related thought (thread peel) |
| Swipe **left** on row | Delete (existing `Swipeable`) |
| Long-press day section label | Open temporal map at that month |

One-time hints under composer explain peel + temporal long-press (`storage/spatialGesturePrefs.ts`).

---

## Interaction summary

### Home depth recall

- **Reveal:** scored candidate exists, gates pass, not in recent stream window.
- **Open:** tap card → thought sheet (Resume).
- **Dismiss:** × on card.

### Thought trail (stream + sheet)

- **Dots** in outer gutter — entries with ≥2 keyword overlap to another entry.
- **Peel** — closest related neighbor by time; one line preview.
- **Sheet rail** — time/date labels for related neighbors.

### Eligibility gates (Echo)

| Gate | Default |
|------|---------|
| Feature flag | `ECHO_LAYER_ENABLED` (`true` in production; Remote Config kill switch later) |
| Min entries | 8 (`ECHO_LAYER_MIN_ENTRY_COUNT`) |
| Min candidates | 1 scored thought |
| Blockers | Search active, read sheet open, composer draft, voice capture, empty stream |

---

## What we explored but did not ship

| Direction | Verdict |
|-----------|---------|
| **StreamEchoPager** (horizontal Echo page) | ❌ Replaced by home depth strip |
| **Echo edge peek** | ❌ Removed with pager |
| Alternate vessels (field, filament, palimpsest, threshold) | ❌ Dev prototypes only |
| **Temporal space** | ✅ In-stream — [`temporal-navigation.md`](temporal-navigation.md) |
| **Two-sided horizontal nav** | ❌ Hidden tabs |
| **AI feed / recommendations** | ❌ Wrong soul |

---

## Technical architecture (mobile repo)

```
constants/echoLayer.ts
utils/selectEchoCandidates.ts
utils/homeDepthRecallVisibility.ts
utils/thoughtTrail.ts
storage/entryEngagementRepository.ts
components/HomeDepthRecall.tsx
components/echo/EchoRecallCardVessel.tsx
screens/CaptureScreen.tsx
```

**Engagement writes:** `recordEntryOpened`, `recordEntryEdited` — local only.

---

## Relationship with temporal navigation

| Concern | Owner |
|---------|--------|
| Jump to month / year | Temporal map sheet |
| Compass while scrolling | Month rack |
| Resurfacing old thoughts | Echo home depth |
| Linked neighbors in context | Thought trail (peel + rail) |

Temporal = **when**; Echo = **what still echoes**; trail = **what shares words**.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-24 | Initial product plan; Echo pager prototype. |
| 2026-05-31 | `ECHO_LAYER_ENABLED` off in production for pager dogfood. |
| 2026-07-09 | Pivot: home depth recall replaces `StreamEchoPager`; spatial trail + temporal shipped; `ECHO_LAYER_ENABLED` on for production. |
