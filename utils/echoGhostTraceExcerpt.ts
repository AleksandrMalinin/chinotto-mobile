import { echoPalimpsestRimExcerpt } from './echoPalimpsestRim';

/** One-line submerged trace — not a feed preview. */
export function echoGhostTraceExcerpt(text: string, maxChars = 42): string {
  return echoPalimpsestRimExcerpt(text, maxChars);
}
