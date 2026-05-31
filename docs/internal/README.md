# Internal documentation

Maintainer and implementation docs. Not linked from the public README.

## Product and architecture

| Doc | Purpose |
|-----|---------|
| [product/product-spec.md](product/product-spec.md) | Full product behavior and guardrails |
| [product/product-brief.md](product/product-brief.md) | One-page external-facing brief |
| [product/temporal-navigation.md](product/temporal-navigation.md) | Stream scrubber + temporal map |
| [product/spatial-navigation.md](product/spatial-navigation.md) | Echo layer exploration |
| [architecture.md](architecture.md) | Detailed stack, modules, evolution |
| [commit-convention.md](commit-convention.md) | Commit message format |

## Sync and release

| Doc | Purpose |
|-----|---------|
| [sync/sync.md](sync/sync.md) | Firestore wire contract (normative) |
| [sync/cross-device-sync-unlock-flow.md](sync/cross-device-sync-unlock-flow.md) | Enable sync / unlock UX |
| [sync/sync-apple-qa.md](sync/sync-apple-qa.md) | Apple/Firebase manual QA |
| [sync/sync-release-checklist.md](sync/sync-release-checklist.md) | Pre-release sync QA (mirror desktop) |
| [sync/universal-links.md](sync/universal-links.md) | `/sync` universal link |
| [sync/desktop-handoff-monetization-deeplinks.md](sync/desktop-handoff-monetization-deeplinks.md) | Desktop QR / monetization handoff |
| [release/ios-app-store-version-bump.md](release/ios-app-store-version-bump.md) | App Store version + build alignment |

**Desktop sync ops:** [Chinotto `docs/internal/sync.md`](https://github.com/AleksandrMalinin/chinotto/blob/main/docs/internal/sync.md).

## Billing and app update

| Doc | Purpose |
|-----|---------|
| [billing/revenuecat-dashboard.md](billing/revenuecat-dashboard.md) | RevenueCat + App Store setup |
| [billing/revenuecat-troubleshooting.md](billing/revenuecat-troubleshooting.md) | Purchase / paywall troubleshooting |
| [app-update/README.md](app-update/README.md) | Remote Config update policy |

Public docs: [privacy.md](../privacy.md), [architecture.md](../architecture.md), [development.md](../development.md).
