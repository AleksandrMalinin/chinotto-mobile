# RevenueCat troubleshooting (Chinotto Mobile)

## Quick QA checklist (compact)

1. **Paywall on:** `EXPO_PUBLIC_ENABLE_PAYWALL=true` + rebuild dev client.
2. **Can buy:** RevenueCat products imported, attached to entitlement **Chinotto Pro**, current offering set.
3. **Fresh purchase test:** Xcode StoreKit transactions cleared, then dev menu → **Reset paywall for purchase testing**.
4. **After purchase:** `[RevenueCat][debug]` shows `activeEntitlementIds` contains **Chinotto Pro**.
5. **If paywall is skipped unexpectedly:** check `[EnableSyncModal][paywall-gate]` → `syncEntitlementSources`.
6. **If already paid:** use **Restore purchases** to re-apply access on reinstall/new device.

## “Enable sync” only shows “Continue with Apple” (no plan picker)

The custom paywall (Monthly / Yearly / Lifetime) runs only when **`isPaywallEnabled()`** is true:

1. Set **`EXPO_PUBLIC_ENABLE_PAYWALL=true`** (or `1`) in `.env` — see `.env.example`.
2. **Restart Metro with a clean cache:** `npx expo start -c`
3. **Rebuild the dev client** (`npx expo run:ios` or EAS Build). `EXPO_PUBLIC_*` values are baked in at bundle time; a stale binary won’t pick up `.env` changes.

Also, if **`hasSyncEntitlement`** is true in **`[EnableSyncModal][paywall-gate]`**, the paywall is skipped (`showPlusPaywall: false`). Open the same log’s **`syncEntitlementSources`**:

| Field | Meaning | Reset |
|--------|---------|--------|
| `revenueCatChinottoPro` | RC says **Chinotto Pro** is active | Sandbox / another Apple ID, or wait for expiry; not an AsyncStorage flag |
| `localTrialActive` | Device **7-day trial** from legacy stub (`@chinotto/plus_trial_started_at_v1`) | Delete that AsyncStorage key or reinstall |
| `legacySubscribed` | Old **`@chinotto/plus_subscribed_v1`** flag | Delete key or reinstall |

Reinstalling the app clears local keys; RC state follows the signed-in store account.

### Clear `legacySubscribed` / trial without reinstall (**`__DEV__`**)

`legacySubscribed` and `localTrialActive` are **not tied to your Apple ID** — they live in AsyncStorage on this device (`@chinotto/plus_subscribed_v1`, `@chinotto/plus_trial_started_at_v1`).

- **Dev menu:** long-press the **Chinotto logo** on the capture screen → **Clear local sync paywall flags**. That removes those keys and refreshes the RevenueCat entitlement mirror from the SDK.
- **Or** delete the app and reinstall.

You **cannot** reset “legacy subscribed” for a specific Apple ID from the server — there is no server record for that flag; it was a pre–RevenueCat local stub.

### Paywall / purchases testing regime (short)

| Goal | What to do |
|------|------------|
| See the **plan picker** again | Clear local flags (dev menu above) and ensure **`revenueCatChinottoPro`** is false (no active **Chinotto Pro** for this RC user). |
| Test **purchase** flows | Sandbox Apple ID + products in ASC + StoreKit config or device; use **`[RevenueCat][debug]`** logs for offerings / entitlements. |
| Isolate **RC vs local** | Watch **`syncEntitlementSources`** in **`[EnableSyncModal][paywall-gate]`** after each action. |
| **CI / Jest** | `resetSubscriptionStateForTests()` + AsyncStorage mocks (see `monetization/__tests__/subscriptionState.test.ts`). |

**Still off?** In **`__DEV__`**, open Enable sync and read **`[EnableSyncModal][paywall-gate]`**: `syncEntitlementSources` shows which of trial / legacy / RC Pro is blocking the paywall. If `fromExtraEnableSyncPaywall` is false after editing `.env`, run **`npx expo run:ios`** again so `app.config.js` rebakes `extra.enableSyncPaywall`.

## Purchase succeeded but paywall / “need sync access” never clears

If logs show **`activeSubscriptions`** with `chinotto.pro.*` but **`activeEntitlementIds`** is **empty** (or no **Chinotto Pro**), RevenueCat is **not** granting the entitlement. The app only checks **`entitlements.active["Chinotto Pro"]`**, not raw subscription ids.

**Fix:** [RevenueCat dashboard](https://app.revenuecat.com) → each **product** → ensure **Chinotto Pro** is attached under entitlements. Name must match **exactly** `Chinotto Pro` (see `docs/internal/billing/revenuecat-dashboard.md`).

After fixing, use **Restore purchases** on the paywall or relaunch; in **`__DEV__`** you should also see **`[Chinotto][RevenueCat]`** warning when this mismatch is detected.

## LogBox: “Error fetching offerings” / `OfferingsManager.Error error 1`

RevenueCat logs this when **none** of the product IDs attached to your offering can be loaded from **App Store Connect** (device/TestFlight) or from a **StoreKit Configuration** file (Simulator).

### Checklist

1. **Bundle ID** — Must match everywhere:
   - Xcode / EAS: `com.chinotto.mobile` (see `app.json` → `ios.bundleIdentifier`).
   - [RevenueCat](https://app.revenuecat.com) → your iOS app.
   - App Store Connect app record.

2. **Product IDs** — In App Store Connect, products must exist with the **exact** identifiers you imported into RevenueCat (e.g. `chinotto.pro.monthly`, `chinotto.pro.yearly`, `chinotto.pro.unlock`). Typos or wrong environment (different app) break offerings.

3. **Agreements & paid apps** — App Store Connect: active **Paid Applications Agreement**, banking, and tax. IAPs often stay invisible to StoreKit until this is complete.

4. **Simulator without ASC** — Apple’s Simulator does **not** load real IAP metadata unless you use a **StoreKit Configuration** file:
   - Xcode → **Product → Scheme → Edit Scheme…** → **Run** → **Options** → **StoreKit Configuration** → select a `.storekit` file whose product IDs match RevenueCat.
   - Or test on a **physical device** with a **Sandbox** Apple ID and builds that match ASC.

   **Cleared transactions but the app still skips the paywall?** **Debug → StoreKit → Manage Transactions** only wipes the **local** receipt. RevenueCat may still return the **previous** customer’s entitlements for this install. After clearing transactions, in **`__DEV__`** long-press the capture-screen logo → **Reset paywall for purchase testing** (for **anonymous** RC users this runs **sync** to push the empty receipt; for **identified** users it **log out**s, then clears local flags). If you saw `LogOut was called but the current user is anonymous`, update the app — that case is handled by **sync** now. Alternatively: **Restore purchases** once the receipt is empty.

5. **API key** — Use the **public** iOS SDK key for the same RevenueCat **project** that owns those products (`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`).

6. **Current offering** — RevenueCat → **Offerings** → mark an offering as **Current**; packages must reference the imported products.

### What the app does

- `loadCurrentChinottoOffering()` and the paywall **do not crash** if offerings fail; you’ll see empty plans / “Plans aren’t available” and the SDK may still print this error to the console.
- Fixing configuration (above) removes the error; no app code change replaces a mismatched ASC/RevenueCat setup.

See also [revenuecat-dashboard.md](./revenuecat-dashboard.md).
