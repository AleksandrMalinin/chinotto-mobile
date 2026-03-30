# Universal links: `/sync` (mobile)

Mobile handles a single entry path so a future **desktop QR** can open:

`https://getchinotto.app/sync`

Custom scheme fallback (same entry): `chinotto://sync`

## What the app does

- **Cold or warm start:** If the URL matches, the app **remembers the intent** until `phase === 'main'`, the database is ready, and subscription state has hydrated—then it opens the **existing** Enable sync sheet (`EnableSyncModal`). No new paywall engine; entitlement rules are unchanged.
- **Already entitled / signed in:** Same sheet as tapping the header: desktop link, health copy, etc.
- **Not entitled:** Same paywall / Sign in with Apple flow as today.

Parsing and gating live in `linking/syncDeepLink.ts` and `linking/useSyncDeepLink.ts`.

## Website / Apple: what you must configure

Universal links **do not work** from app config alone. The site must serve Apple’s **Associated Domains** payload:

1. **Host** `https://getchinotto.app` (exact team/bundle alignment in App Store Connect).
2. **AASA file** at  
   `https://getchinotto.app/.well-known/apple-app-site-association`  
   (or legacy root path per Apple docs), **no file extension**, `application/json`, including your **Team ID + bundle id** `com.chinotto.mobile` and the **`/sync`** path (exact path; query strings on the URL are fine).
3. After changing **associated domains** in the app, **rebuild the iOS binary** (`expo run:ios`, EAS build, or Xcode). The entitlement is embedded at build time.

Apple validates AASA asynchronously; allow time after first deploy. Test on a **physical device** when possible; Simulator can be flaky for universal links.

**Subdomains** (e.g. `www.getchinotto.app`) need their own `applinks:` entries and AASA if you use them in the QR.

## What desktop can assume later

- QR or link target: **`https://getchinotto.app/sync`** (stable contract).
- If the app is installed and sync is configured on device, the user lands in the **same** sync entry UX as “Enable sync” in the header.
- If the app is missing, the **same URL** can be a normal web page (onboarding, App Store, etc.) once the site ships that HTML.

No pairing tokens or backend are implied by this URL.

## iOS testing tips

- **Custom scheme:** `npx uri-scheme open chinotto://sync --ios` (or Safari/Notes) to verify JS without AASA.
- **Universal link:** After AASA + install, long-press or open in Safari; the banner should offer the app. If it always opens Safari, check AASA, entitlements rebuild, and that the link is **https** on the **exact** associated host.
- **Deferred open:** Complete welcome/brand if needed; the pending intent fires when capture is ready.
