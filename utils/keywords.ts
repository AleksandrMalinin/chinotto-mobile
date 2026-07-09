const MIN_LEN = 2;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
  'this', 'that', 'these', 'those', 'it', 'its', 'not', 'no', 'only', 'same', 'so', 'than',
  'too', 'very', 'just', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'own', 'am', 'we', 'us', 'he', 'me', 'my', 'll', 're', 've',
]);

function isStopword(w: string): boolean {
  const trimmed = w.trim();
  return trimmed.length < MIN_LEN || STOPWORDS.has(trimmed);
}

export function tokenize(text: string): string[] {
  return text
    .split(/[^0-9A-Za-z\u00C0-\u024F]+/u)
    .map((s) => s.toLowerCase())
    .filter((s) => s.length >= MIN_LEN && !isStopword(s));
}

export function keywordOverlap(textA: string, textB: string): number {
  const a = new Set(tokenize(textA));
  const b = new Set(tokenize(textB));
  let count = 0;
  for (const term of a) {
    if (b.has(term)) {
      count += 1;
    }
  }
  return count;
}
