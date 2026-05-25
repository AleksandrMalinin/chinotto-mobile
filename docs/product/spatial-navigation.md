# Spatial navigation (mobile)

Product and implementation plan for **adjacent mental layers** beside the capture stream — without tabs, folders, or PKM chrome.

**Status:** Echo layer shipped behind `ECHO_LAYER_ENABLED` (on) — **Threshold** UI (one presence + ghosts). Continuity exploration — [`echo-continuity-exploration.md`](echo-continuity-exploration.md). Temporal orientation — see [`temporal-navigation.md`](temporal-navigation.md).  
**Related:** [`product-spec.md`](product-spec.md), [`../../AGENTS.md`](../../AGENTS.md).

---

## Problem

The stream is an infinite reverse-chronological list. As history grows:

- Users lose **attention context** — what still pulls on them vs what merely passed.
- A single vertical feed cannot express **memory drift** or **gravity** without becoming a notes manager.
- Horizontal “surfaces” in consumer apps usually become **tabs, dashboards, or feeds** — wrong register for Chinotto.

We need **one optional adjacent layer** for quiet recall, without write-time decisions or organization primitives.

---

## Product thesis

> Spatial navigation is **orientation of attention**, not **organization of content**.

The user should feel: **“something is still here with me”** — not **“the app sorted my notes.”**

### Core challenge

Evolve beyond “infinite feed of thoughts” **without** becoming a note organization system.

**Answer:** grow along **time** (temporal nav — in-stream) and **attention** (Echo — horizontal), not **structure** (folders, tags, graphs).

---

## System (two axes, not four tabs)

| Axis | Surface | Metaphor | Status |
|------|---------|----------|--------|
| **Vertical / in-stream** | Month rack + temporal map sheet | “Where am I in time?” | See [`temporal-navigation.md`](temporal-navigation.md) |
| **Horizontal / adjacent** | **Echo layer** (single page) | “What still echoes?” | Dev prototype |

**Do not stack:** bottom tabs + multiple horizontal pages + temporal sheet + search filters. Maximum navigation complexity while staying calm: **stream + search + temporal overlay + one Echo page**.

```
[ Echo ]  ←—— swipe right ——  [ Stream + fixed capture ]
                ↑
        temporal rack / map (overlay on stream only)
```

---

## Echo layer (horizontal)

### Role

Sparse **memory drift** surface — merges two exploration threads:

| Signal | User feeling | Echo copy hint |
|--------|--------------|----------------|
| **Gravity** — revisits, edits | “Still here” | Whisper: *Still here* |
| **Drift** — old, long-unseen | “From earlier” | Whisper: *From earlier* |

Not: recommendations, AI feed, favorites, pins, or “related thoughts” UI.

### In bounds

- **One** horizontal page (Echo), **conditional** — no page until ≥3 candidates.
- **≤7 scored slots** — Threshold UI shows **1 primary + 2 ghosts** (no Echo-page scroll).
- Tap row → existing `EntryThoughtSheet`.
- **Fixed composer + search** above pager — capture never pans away.
- Local-only **engagement signals** (`open_count`, `edit_count`, `last_opened_at`) — not synced to desktop.
- Selection uses silent scoring + salted shuffle — **never explain “why”** to the user.

### Out of bounds

- Tab bar, page dots, section titles (“Memories”, “For you”).
- Second horizontal page (left + right).
- Graph / orbit / cluster visualization.
- Connected-thought **surface** (may influence Echo slots only).
- Full-bleed **Horizon** timeline page (duplicates temporal map).
- User-facing “memory settings”, pins, stars, streaks.

---

## UX principles (Chinotto-specific)

1. **Stream is home** — app open lands on stream; Echo is optional drift.
2. **Capture-first** — composer fixed; horizontal nav off during search and read sheet.
3. **Gesture separation** — Echo = swipe **right** on list area; delete = swipe **left** on row (see below).
4. **Calm copy** — one whisper line max; no headers, no algorithm language.
5. **Temporal stays in-stream** — do not horizontalize the timeline (calendar brain).
6. **Undiscoverable is OK** — ambient features need not shout; optional one-time edge peek later.

---

## Gesture model (critical)

| Gesture | Result |
|---------|--------|
| Swipe **right** on stream list | Reveal Echo (trailing page is stream home) |
| Swipe **left** on stream list | No Echo (pager at home edge) |
| Swipe **left** on row | Delete (existing `Swipeable`) |

**Pager layout:** `[ Echo @ x=0 | Stream @ x=pageWidth ]` — default offset = stream page.  
This separation prevents accidental delete when reaching for Echo.

Delete requires near-full row reveal (`rightThreshold` on stream rows).

---

## Interaction summary

### Echo page

- **Reveal:** swipe right when Echo is eligible.
- **Return:** swipe left from Echo, or open search / read sheet (pager snaps home).
- **Empty / ineligible:** pager not mounted — stream only.

### Visual language (distinct from stream)

Echo must **not** reuse stream row chrome (hairlines, section labels, clock timestamps).

| Stream | Echo |
|--------|------|
| Reverse-chronological feed | Sparse fragments (≤7) |
| Day sections + inline clock time | Zone header + relative age (“weeks ago”) |
| Cool violet ambient (shared shell) | Warm memory wash (`EchoAmbience`) on page only |
| Hairline row separators | Rounded fragment panels + kind accent bar |
| Swipe left on row → delete | No delete — read-only recall |

**Visual silence:** no kicker/caption explaining Echo; relative age + accent dot only ([`EchoThresholdVessel`](../components/echo/EchoThresholdVessel.tsx)).

**Fragments:** `Revisited` (warm accent) vs `Earlier` (cool accent) — hints only, never “recommended”.

### Eligibility gates

| Gate | Default |
|------|---------|
| Feature flag | `ECHO_LAYER_ENABLED` (on; Remote Config kill switch later) |
| Min entries | 40 (`ECHO_LAYER_MIN_ENTRY_COUNT`) |
| Min candidates | 3 scored thoughts |
| Blockers | Search active, read sheet open |

---

## What we explored but did not build

| Direction | Verdict |
|-----------|---------|
| **Resurfacing / memory drift** | ✅ Merged into Echo (drift slots) |
| **Persistent / alive thoughts** | ✅ Merged into Echo (gravity slots) |
| **Temporal space** | ✅ In-stream only — [`temporal-navigation.md`](temporal-navigation.md) |
| **Connected thought space** | ⚠️ Influence Echo selection only — **no surface** |
| **Two-sided horizontal nav** | ❌ Hidden tabs |
| **Horizon (full-bleed timeline)** | ❌ Duplicates temporal map |
| **Dynamic / infinite pages** | ❌ Breaks calm |
| **AI feed / recommendations** | ❌ Wrong soul |

---

## Rollout phases

| Phase | Deliverable | Ship criteria |
|-------|-------------|---------------|
| **0** | Finish temporal in-stream | See temporal doc |
| **1** | `entry_engagement` table + open/edit instrumentation | Done — local-only |
| **2** | Echo prototype + `StreamEchoPager` + dev flag | Done — dogfood |
| **2b** | Gesture fix — Echo right, delete left | Done |
| **3** | Edge peek + parallax + snap haptic | UI polish |
| **4** | Selection tuning + RC kill switch | Opt-in analytics only |
| **5** | Evaluate keep / kill | No capture regression; qualitative calm |

**Kill switch:** `ECHO_LAYER_ENABLED` (Remote Config later; dev menu today).

**Analytics (optional, opt-in):** `echo_layer_revealed`, `echo_entry_opened` — no ranking telemetry in UI.

---

## Technical architecture (mobile repo)

```
constants/echoLayer.ts
utils/selectEchoCandidates.ts       # gravity + drift scoring (pure)
utils/echoLayerVisibility.ts        # gates + pager interactivity
storage/entryEngagementRepository.ts
storage/db.ts                       # entry_engagement table
components/echo/
  EchoLayer.tsx
  StreamEchoPager.tsx               # [ Echo | Stream ], home = trailing page
screens/CaptureScreen.tsx           # fixed composer, pager wraps stream scroll only
```

**Engagement writes:**

- `recordEntryOpened` — on read sheet open (excludes demo stream ids).
- `recordEntryEdited` — on `updateEntryText` success.
- Rows deleted with entry / remote tombstone.

**Libraries:**

- `react-native-gesture-handler` `ScrollView` for horizontal pager (nested vertical stream).
- No new pager dependency.

---

## Relationship with temporal navigation

| Concern | Owner |
|---------|--------|
| Jump to month / year | Temporal map sheet |
| Compass while scrolling | Month rack |
| Resurfacing old thoughts | Echo |
| “What still pulls on me” | Echo |

Never duplicate timeline as a full horizontal page. Temporal = **when**; Echo = **what still echoes**.

---

## Accessibility

- Echo rows: same accessibility pattern as stream rows (label + “Opens thought”).
- Whisper line is decorative context, not sole affordance.
- VoiceOver: Echo is a second page in horizontal scroll — ensure stream home is default focus on open.
- `Reduce Motion`: instant page snap; no parallax until Phase 3 respects reduce motion.

---

## Success checks

- [ ] Capture still feels instant on every open.
- [ ] Echo invisible until meaningful history + candidates exist.
- [ ] Swipe right → Echo; swipe left on row → delete — no cross-trigger.
- [ ] No new organization primitives (folders/tags/graph/pins).
- [ ] No “why am I seeing this?” UI.
- [ ] Stream remains default after background / cold open.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-24 | Initial product plan from spatial UX exploration. |
| 2026-05-24 | Phase 1–2: `entry_engagement`, Echo layer, `StreamEchoPager`, dev menu toggle. |
| 2026-05-24 | Gesture fix: Echo on swipe **right**; stream home on trailing page; delete threshold tightened. |
| 2026-05-24 | Echo visual redesign — warm ambience, fragment cards, relative age, zone header (not stream rows). |
| 2026-05-24 | `ECHO_LAYER_ENABLED` default on; removed dev menu toggle. |
| 2026-05-24 | Echo polish — opaque shell, theme text colors, capture veil + composer fade on Echo page. |
| 2026-05-25 | Threshold Echo UI; continuity mechanics (cooldown, stems, interruption); [`echo-continuity-exploration.md`](echo-continuity-exploration.md). |
