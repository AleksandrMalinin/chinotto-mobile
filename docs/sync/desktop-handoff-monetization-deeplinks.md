# Desktop handoff — monetization & mobile deep links

Short reference for **Chinotto desktop** when integrating QR, sync messaging, or cross-sell. **Mobile repo** is source of truth for app behavior.

---

## Monetization (what matters for alignment)

| Topic | Mobile today |
|--------|----------------|
| **Sync paywall engine** | **RevenueCat** (custom in-app UI, not hosted RC paywalls). |
| **Access rule** | Entitlement **`Chinotto Pro`** (dashboard string, case-sensitive) — not individual store SKUs. |
| **Desktop billing** | **Not defined here.** Desktop can keep its own model; Firestore/desktop auth stays whatever the desktop app already implements. |

Do not assume desktop and mobile share a single checkout surface unless you add that product-wise later.

---

## Deep link / QR → mobile

| Item | Contract |
|------|-----------|
| **QR / link URL** | **`https://getchinotto.app/sync`** (path **`/sync`** exactly; **not** `/sync/...` extra path segments). Desktop may append **`?ds=<uuid>`** (v4) so the phone can signal that modal session in Firestore after unlock. |
| **Fallback URL (dev / tests)** | **`chinotto://sync`** (optional `?ds=` same as HTTPS). |
| **`ds` query** | Opaque **UUID v4** per desktop “Enable sync” open. Mobile stashes it from the opened URL and writes **`sync_desktop_sessions/{ds}`** when sync access is confirmed (entitlement + Apple sign-in on device). No PII. |
| **On mobile** | Same entry as **Enable sync** in the header: existing paywall + Sign in with Apple + `EnableSyncModal`; entitled users see the same post-sync sheet (e.g. desktop link copy) as today. |

**Website / Apple:** Universal links require **AASA** on `getchinotto.app` and an **iOS build** with `associatedDomains`. Details: [`universal-links.md`](./universal-links.md).

**Cold start:** Mobile queues the intent until capture is ready (welcome/brand done, DB + subscription hydration). Intent is not dropped.

---

## Desktop should **not** assume

- That opening the link **without** completing paywall + Apple on the phone means sync is paid or entitled.
- **Exception:** `ds` is **not** proof of purchase by itself; Firestore **`sync_desktop_sessions/{ds}.unlocked`** is set only after mobile confirms access (see `docs/sync/sync.md` §3).
- Android app links (mobile is **iOS-first** for this path; Android may follow separately).

---

## Pointers

- **End-to-end unlock UX & states (desktop + mobile):** [`cross-device-sync-unlock-flow.md`](./cross-device-sync-unlock-flow.md)
- Mobile universal links & testing: [`docs/sync/universal-links.md`](./universal-links.md)
- RevenueCat / entitlement checklist (mobile): [`docs/billing/revenuecat-dashboard.md`](../billing/revenuecat-dashboard.md)
- Wire + Firestore: [`docs/sync/sync.md`](./sync.md)
