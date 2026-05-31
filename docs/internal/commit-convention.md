# Chinotto Mobile – Commit message convention

Strict, conventional-style commits for a solo builder. No vague or noisy wording; history should be easy to scan.

---

## 1. Commit format

```
<type>(<scope>): <subject>

[optional body]
```

- **Subject:** One line, imperative mood, lowercase after the colon, no period at the end. Max ~72 chars.
- **Scope:** Optional; use when it clarifies *where* the change lives (e.g. `capture`, `storage`, `theme`, `welcome`).
- **Body:** Optional; use only when one line is not enough (e.g. breaking change, non-obvious fix).

**Subject rules:**

- Start with a verb: *add*, *fix*, *refactor*, *remove*, *upgrade*, etc.
- Be specific: what changed, not why you did it.
- No emoji, no "WIP", no "finally", no "hopefully", no "small"/"minor"/"quick".

---

## 2. Allowed types

| Type       | Use for |
|-----------|---------|
| `feat`    | New user-facing behavior or capability. |
| `fix`     | Bug fix (behavior was wrong; now correct). |
| `refactor`| Code change that doesn't fix a bug or add a feature (reorg, rename, simplify). |
| `perf`    | Performance improvement. |
| `chore`   | Build, tooling, deps, config, scripts. No app logic. |
| `docs`    | Documentation only (README, docs/, comments that are purely docs). |
| `style`   | Formatting, whitespace, quotes. No logic or UI change. |
| `test`    | Adding or changing tests only. |

**Not used in this repo:** `ci` (use `chore`), `revert` (write a normal `fix` or `revert` message instead).

---

## 3. Rules

1. **One logical change per commit.** One feature slice, one fix, one refactor. No "and also" in the subject.
2. **Scope only when it helps.** Prefer `feat(capture): add header logo` over `feat: add header logo` when the change is clearly in the capture flow. Omit scope for app-wide or small changes.
3. **Imperative, present tense.** "add welcome screen" not "added welcome screen" or "adds welcome screen".
4. **No emotional or filler words.** Avoid: *finally*, *hopefully*, *quick*, *small*, *minor*, *just*, *really*, *actually*, *sorry*, *oops*, *WIP*, *wip*, *temp*, *temporary*.
5. **No vague subjects.** "fix bug" and "update code" are forbidden. Say what you fixed or what you updated.
6. **Body only when needed.** Use body for breaking changes, non-obvious rationale, or multiple concrete points. Keep it short and factual.
7. **Granularity (see below).** Prefer smaller, scannable commits over one big "stuff" commit.

---

## 4. Granularity: one commit vs several

**One commit when:**

- A single feature slice (e.g. "persist entry on submit") that touches a few files and one concern.
- One bug fix with a clear cause (e.g. "fix recent list not refreshing after save").
- One refactor that doesn't mix with features (e.g. "refactor entry repository into storage module").
- Dependency or tooling change that's clearly one step (e.g. "chore: upgrade Expo SDK").

**Split into several commits when:**

- You add a feature *and* fix an unrelated bug. Two commits: one `feat`, one `fix`.
- You refactor and add behavior. Prefer: refactor first (one commit), then add behavior (second commit).
- You change UI and move files. Prefer: move/refactor first, then UI change.
- Multiple unrelated concerns (e.g. a new screen + new storage API + theme tokens). Consider one commit per layer if the change is large; otherwise one commit is fine if it's one logical feature.

**Rule of thumb:** If the subject would need "and" or "also", split or rephrase so one subject = one thing.

---

## 5. Good examples (mobile-specific)

```
feat(capture): add header logo
feat(welcome): add stream flow panel to onboarding
fix(storage): await sqlite init before first read
refactor(app): split brand vs welcome phase
refactor(theme): align atmosphere tokens with design system
perf(capture): debounce recent list refresh
chore: add expo-splash-screen config plugin
chore: add script to generate app icons from svg
chore: add expo-dev-client
docs: add commit convention
style: normalize quote style in TS files
```

With scope omitted where it's obvious or app-wide:

```
feat: add async storage flag for welcome completion
fix: prevent splash flash before fonts load
refactor: move welcome helpers to storage/welcomeFlag
```

With body (only when needed):

```
fix(expo): align splash image with native prebuild

Regenerate ios/android after changing splash-icon.png.
```

---

## 6. Bad examples (avoid)

```
fix bug
update stuff
WIP capture
fix: fix the thing
feat: added new feature
chore: small changes
refactor: refactor code
fix: hopefully this works
chore: oops fix typo
feat(capture): add input and fix theme and upgrade expo
docs: update readme
style: improve UI
```

**Why they're bad:**

- "fix bug" / "update stuff" – vague; no idea what changed.
- "WIP capture" – not a proper type/subject; noisy.
- "fix: fix the thing" – redundant and vague.
- "added new feature" – past tense; not imperative.
- "small changes" – emotional/filler; not specific.
- "refactor code" – says nothing about what was refactored.
- "hopefully this works" / "oops fix typo" – emotional/noisy.
- "add input and fix theme and upgrade expo" – multiple logical changes; split into three commits.
- "update readme" – too vague; prefer "docs: add run instructions to README" or similar.
- "style: improve UI" – `style` is for formatting (e.g. quotes); UI changes are `feat` or `fix`.

---

## Summary

- **Format:** `type(scope): imperative subject`, optional body.
- **Types:** `feat` | `fix` | `refactor` | `perf` | `chore` | `docs` | `style` | `test`.
- **Rules:** One logical change per commit; imperative; no vague or emotional wording; scope when it helps.
- **Granularity:** One commit per feature slice / fix / refactor; split when you'd need "and" in the subject.
