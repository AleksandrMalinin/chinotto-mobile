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
| **QR / link URL** | **`https://getchinotto.app/sync`** only (path **`/sync`** exactly; `?query` allowed; **not** `/sync/...` extra path segments). |
| **Fallback URL (dev / tests)** | **`chinotto://sync`** |
| **Payload** | **None.** No user id, subscription flag, or pairing token in the URL yet. |
| **On mobile** | Same entry as **Enable sync** in the header: existing paywall + Sign in with Apple + `EnableSyncModal`; entitled users see the same post-sync sheet (e.g. desktop link copy) as today. |

**Website / Apple:** Universal links require **AASA** on `getchinotto.app` and an **iOS build** with `associatedDomains`. Details: [`universal-links.md`](./universal-links.md).

**Cold start:** Mobile queues the intent until capture is ready (welcome/brand done, DB + subscription hydration). Intent is not dropped.

---

## Desktop should **not** assume (yet)

- Query parameters on `/sync` for pairing or account linking.
- That opening the link proves subscription on the device (Apple + RC handle that inside the app).
- Android app links (mobile is **iOS-first** for this path; Android may follow separately).

---

## Pointers

- Mobile universal links & testing: [`docs/sync/universal-links.md`](./universal-links.md)
- RevenueCat / entitlement checklist (mobile): [`docs/billing/revenuecat-dashboard.md`](../billing/revenuecat-dashboard.md)
- Wire + Firestore: [`docs/sync/sync.md`](./sync.md)
