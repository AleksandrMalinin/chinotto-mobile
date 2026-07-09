import { tokenize } from './keywords';

export function sharedKeywords(textA: string, textB: string, limit = 5): string[] {
  const a = new Set(tokenize(textA));
  const b = new Set(tokenize(textB));
  const shared: string[] = [];
  for (const term of a) {
    if (b.has(term)) {
      shared.push(term);
    }
  }
  shared.sort();
  return shared.slice(0, limit);
}
