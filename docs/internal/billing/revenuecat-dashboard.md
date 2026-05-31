# RevenueCat + App Store — configuration checklist (Chinotto Mobile)

Use this when wiring **Chinotto Pro** and store products for sync. The app treats **entitlements** as the source of truth; products only unlock that entitlement in RevenueCat.

## App Store Connect (iOS)

1. Create **in-app purchase** products; identifiers must match what you import into RevenueCat (examples):
  - `chinotto.pro.monthly` (auto-renewable subscription)
  - `chinotto.pro.yearly` (auto-renewable subscription)
  - `chinotto.pro.unlock` or `chinotto.pro.lifetime` (non-consumable / lifetime — your choice of id)
2. The app maps tiers by **suffix** (`.monthly`, `.yearly`, `.lifetime`) and treats **`unlock`** as lifetime (`unlock`, `.unlock`, `_unlock`).
3. Complete **agreements, tax, banking**, and subscription group setup for subscriptions.
4. Submit products for review as required for your workflow.

## RevenueCat project

1. Create an **iOS app** with the same **bundle id** as the native app (`app.json` / Xcode after prebuild).
2. **Import products** from App Store Connect (same ids as above).
3. Create entitlement **Chinotto Pro** (exact name — case-sensitive, must match `CHINOTTO_PRO_ENTITLEMENT_ID` in code).
4. **Critical:** attach **every** subscription / IAP product to entitlement **Chinotto Pro** (product → **Associated entitlements**). If a product is sold but **not** linked, Apple/RevenueCat will show an **active subscription** while `customerInfo.entitlements.active` stays **empty** for Chinotto Pro — **the app will keep showing the paywall** because gating uses entitlements only.

### Symptom: purchase succeeds, dashboard shows revenue, paywall still appears

In Metro, **`[RevenueCat][debug]`** may show `activeSubscriptions: ["chinotto.pro.monthly"]` but **`activeEntitlementIds: []`**. That is almost always **missing product → entitlement link** in RevenueCat (or wrong entitlement identifier). Fix the dashboard attachment, then **Restore purchases** or restart the app so `CustomerInfo` refreshes.
5. Create an **offering** (e.g. `default`) and add three **packages** linked to those store products, **or** use RevenueCat template identifiers (`$rc_monthly`, `$rc_annual`, `$rc_lifetime`) — the app maps those too.
6. Mark that offering as **Current** so `Purchases.getOfferings().current` is non-null in production.

## After dashboard setup (what to do next)

1. **Production key:** Set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` to your **public** iOS SDK key (EAS env / local `.env` for release builds). Never commit secrets.
2. **Dev client:** Rebuild a native binary (`expo run:ios` or EAS Build) — RevenueCat does not run in Expo Go.
3. **Verify on device:** Open the app, complete a **sandbox** purchase (or use a StoreKit config file in Xcode), then confirm **Chinotto Pro** appears in RevenueCat’s customer view and that sync gating matches (`hasChinottoPro` / cache refresh).
4. **Paywall (when you build it):** Call `loadCurrentChinottoOffering()` for rows, `purchaseChinottoPackage(rcPackage)` to buy, and `restorePurchases()` where appropriate.

## Android (later)

1. Create products in Play Console matching the ids you configure in RevenueCat.
2. Set `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` and mirror the same entitlement + offering structure.

## Development: subscription / product logging

In **`__DEV__`**, the app logs a structured snapshot (entitlements, active subscriptions, purchased product IDs, current offering + packages + prices) as **`[RevenueCat][debug]`** in the Metro console when:

- the app finishes **`bootstrapRevenueCat`** (`bootstrap`),
- the enable-sync paywall finishes **prefetching offerings** (`enable-sync-paywall` or `…offering unavailable`),
- a **purchase completes** (`after-purchase`),
- the user taps **Restore purchases** (`after-restore`).

Implementation: `src/services/purchases/revenueCatDebugLog.ts`.

## Code references

- Entitlement id: `CHINOTTO_PRO_ENTITLEMENT_ID` in `src/services/purchases/constants.ts`
- Product → tier mapping: `storeProductIdToKind` / `inferChinottoPackageKind` in `chinottoPackages.ts` (suffixes + `unlock` → lifetime)
- Offering load: `loadCurrentChinottoOffering()` in `src/services/purchases/offerings.ts`
- Purchase: `purchaseChinottoPackage()` in `src/services/purchases/purchasePackage.ts`

## Expo / dev client

- RevenueCat requires **native code** — use a **development build** (`expo run:ios` / EAS), not Expo Go.
- After changing native dependencies, run **prebuild** / rebuild the dev client.

## Offerings fetch errors (Simulator / ASC)

If you see **Error fetching offerings** in LogBox, see [revenuecat-troubleshooting.md](./revenuecat-troubleshooting.md).

