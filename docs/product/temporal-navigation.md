# Temporal navigation (mobile)

Product and implementation plan for **memory-oriented** time navigation in the capture stream — without folders, calendars, or PKM chrome.

**Status:** In progress (`feat/temporal-navigation`).  
**Related:** [`product-spec.md`](product-spec.md), [`../../AGENTS.md`](../../AGENTS.md).

---

## Problem

The stream is reverse-chronological and paginated. As history grows:

- Users lose **when** they are in their own timeline.
- Long scroll creates **infinite-feed anxiety**.
- Desktop already supports **calendar-style revisit**; mobile has day section labels only (`Today`, `Yesterday`, weekday rows) — helpful locally, not for **months/years**.

We need lightweight **temporal orientation** and **jump to a period** without becoming a notes manager or calendar app.

---

## Product thesis

> Temporal navigation is **orientation**, not **organization**.

The user should feel: **“I’m revisiting moments”** — not **“I’m managing notes.”**

### In bounds

- Floating **month** indicator while exploring the stream (Photos-inspired).
- **Temporal map** bottom sheet: vertical timeline of months/years, tap to jump.
- Read-only aggregates (thought count per month) as ambient context.
- Hidden during capture-at-top and while **search** is active.

### Out of bounds

- Calendar grids, week numbers, date pickers.
- Folders, tags, filters, “archive”.
- Productivity / analytics dashboards (heatmap grids, streaks).
- Any UI that **regularly** delays capture or adds write-time decisions.

---

## System (two connected surfaces)

| Surface | Role | Metaphor |
|--------|------|----------|
| **Floating month scrubber** | Compass while scrolling; optional scrub; tap opens map | “Where am I in time?” |
| **Temporal map sheet** | Deliberate jump to a month | “Memory timeline” |

Same month label in both places. Scrubber is **velocity-aware** and **non-blocking**; map sheet is **reflective** and **tappable**.

---

## UX principles (Chinotto-specific)

1. **Capture-first** — scrubber/map never appear on cold open at composer; gate on scroll depth and/or entry count.
2. **Stream-first** — uninterrupted list; overlay uses `pointerEvents="box-none"` except on the pill.
3. **Human labels** — day headers stay as today (`groupEntriesByDate`); scrubber uses **month** (+ year when needed).
4. **Calm copy** — “12 thoughts” not “12 notes”; no “archive”, “manage”, “organize”.
5. **Coexist with Write peek** — scrubber upper-trailing; “Write” bottom-trailing (existing).
6. **Search exclusion** — temporal chrome off when `Find in stream` is active.

---

## Interaction summary

### Month rack (passive → scrub)

- **Passive:** trailing vertical rack (3+ visible months, center = active) fades in when scrolling; follows stream month when not scrubbing.
- **Scrub:** drag rack → snap by month, light haptic per month boundary; on release → jump stream to newest thought in that month.
- **Tap** active (center) month → temporal map sheet (phase C).

### Temporal map sheet

- Modal bottom sheet (same shell rules as `EntryThoughtSheet` — flex dismiss, sheet last child, no `KeyboardAvoidingView` on shell).
- Vertical list: **years** (muted headers) → **months** (primary rows).
- Optional soft activity bar (width vs personal max count) — not a dot calendar.
- Tap month → dismiss → scroll stream to newest entry in that month (load pages until anchor exists).

---

## Rollout phases

| Phase | Deliverable | Ship criteria |
|-------|-------------|---------------|
| **A** | Product doc, `monthKey` utils, `getMonthSummaries` / `getNewestEntryInMonth` SQL | Tests green; query fast on device |
| **B** | Trailing **month rack** (vertical snap carousel at screen edge) | Done — dev menu toggle; hidden when search |
| **C** | Temporal map sheet + jump-to-month | Lands on correct month; empty months OK |
| **D** | Scrub gesture + haptics | No conflict with swipe-delete |
| **E** | Activity wash + motion polish | Still calm; feature flag / RC kill switch |

**Kill switch:** `TEMPORAL_NAV_ENABLED` (dev menu first, Remote Config later).

**Analytics (optional):** `temporal_map_open`, `temporal_jump_month`, `temporal_scrub_used` — only when analytics opted in.

---

## Technical architecture (mobile repo)

```
utils/streamMonthIndex.ts     # monthKey, labels, visible-month helpers
constants/temporalNavigation.ts
storage/entryRepository.ts    # getMonthSummaries, getNewestEntryInMonth
components/temporal/          # Phase B+ UI
hooks/useTemporalNavigation.ts
```

**Scroll sync:** layout map `monthKey → contentOffsetY` from first row of each month; binary search on `streamScrollY`; `scrollTo` after pagination satisfies anchor.

**Libraries (phased):**

- **Now:** RN `Animated`, `react-native-gesture-handler`, `expo-haptics` (existing).
- **When needed:** `react-native-reanimated` for UI-thread scrubber opacity.
- **If list perf degrades:** `@shopify/flash-list` (single scroll container refactor).
- **Avoid for v1:** `@gorhom/bottom-sheet` — extend in-house sheet pattern instead.

---

## Accessibility

- Map sheet is primary path for VoiceOver (scrubbing is enhancement).
- Scrubber: adjustable or button with clear hint.
- `Reduce Motion`: instant jumps, no scrub haptics.
- Announce month on jump.

---

## Success checks

- [ ] Capture still feels instant on every open.
- [ ] Temporal UI invisible until user has explored the stream (gates).
- [ ] Jump to month is correct across timezones and year boundaries.
- [ ] No new organization primitives (folders/tags/calendar grid).
- [ ] Matches Chinotto visual language (meta type, hairlines, no card grid).

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-24 | Initial product plan; Phase A foundation on `feat/temporal-navigation`. |
| 2026-05-24 | Phase B passive scrubber + dev menu toggle (`Temporal scrubber on/off`). |
| 2026-05-24 | Month rack carousel at trailing edge (`TemporalMonthRack`) replaces single-month pill. |
