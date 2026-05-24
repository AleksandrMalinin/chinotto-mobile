export type SearchTextSegment = {
  text: string;
  match: boolean;
};

/** Split display text into matched / plain spans for recall highlighting (case-insensitive). */
export function splitTextBySearchQuery(displayText: string, query: string): SearchTextSegment[] {
  const needle = query.trim();
  if (needle.length === 0) {
    return [{ text: displayText, match: false }];
  }

  const lower = displayText.toLowerCase();
  const needleLower = needle.toLowerCase();
  const segments: SearchTextSegment[] = [];
  let start = 0;

  while (start < displayText.length) {
    const index = lower.indexOf(needleLower, start);
    if (index === -1) {
      if (start < displayText.length) {
        segments.push({ text: displayText.slice(start), match: false });
      }
      break;
    }
    if (index > start) {
      segments.push({ text: displayText.slice(start, index), match: false });
    }
    segments.push({
      text: displayText.slice(index, index + needle.length),
      match: true,
    });
    start = index + needle.length;
  }

  return segments.length > 0 ? segments : [{ text: displayText, match: false }];
}
