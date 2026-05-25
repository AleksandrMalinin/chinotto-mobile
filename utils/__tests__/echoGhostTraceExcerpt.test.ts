import { echoGhostTraceExcerpt } from '../echoGhostTraceExcerpt';

describe('echoGhostTraceExcerpt', () => {
  it('returns trimmed single-line hook', () => {
    expect(echoGhostTraceExcerpt('  hello   world  ')).toBe('hello world');
  });

  it('truncates with ellipsis', () => {
    const long = 'a'.repeat(50);
    expect(echoGhostTraceExcerpt(long)).toHaveLength(43);
    expect(echoGhostTraceExcerpt(long).endsWith('…')).toBe(true);
  });
});
