/**
 * Merge on-device speech into the capture field without double spaces.
 * For live partials, pass the composer snapshot from mic start as `previous` each time
 * (see `voiceCaptureBaseRef` on the capture screen) so the recognized line replaces itself.
 */
export function mergeVoiceTranscript(previous: string, spoken: string): string {
  const t = spoken.trim();
  if (!t) return previous;
  const p = previous.trim();
  return p ? `${p} ${t}` : t;
}
