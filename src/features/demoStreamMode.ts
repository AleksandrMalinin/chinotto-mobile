/**
 * Optional **filled stream** for marketing / screenshots (ship default: off).
 *
 * Set `EXPO_PUBLIC_DEMO_STREAM=1` in `.env`, restart Metro with `-c`, rebuild native if needed.
 * Also shows the sync header in the **idle connected** state (`Sync on` + dot) for captures.
 * See `dev/demoStreamEntries.ts` for sample rows.
 */
function parseDemoStreamFlag(raw: string | undefined | null): boolean {
  if (raw == null || raw === '') {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** Metro inlines `EXPO_PUBLIC_*` at bundle time — restart after `.env` changes. */
export function isDemoStreamMode(): boolean {
  return parseDemoStreamFlag(process.env.EXPO_PUBLIC_DEMO_STREAM);
}
