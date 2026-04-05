/** Merge on-device speech into the capture field without double spaces. */
export function mergeVoiceTranscript(previous: string, spoken: string): string {
  const t = spoken.trim();
  if (!t) return previous;
  const p = previous.trim();
  return p ? `${p} ${t}` : t;
}
