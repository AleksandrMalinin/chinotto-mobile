import { getCaptureContinuationHint } from '../captureContinuationHint';

describe('getCaptureContinuationHint', () => {
  const now = new Date('2026-05-24T12:00:00.000Z');

  it('returns best overlapping recent entry', () => {
    const hint = getCaptureContinuationHint(
      [
        {
          id: 'a',
          text: 'api refactor error handling pass',
          createdAt: '2026-05-20T10:00:00.000Z',
        },
        {
          id: 'b',
          text: 'unrelated lunch plan',
          createdAt: '2026-05-21T10:00:00.000Z',
        },
      ],
      'api refactor error release',
      'new-id',
      now,
    );
    expect(hint?.entry_id).toBe('a');
    expect(hint?.days_earlier).toBe(4);
    expect(hint?.shared_terms).toEqual(expect.arrayContaining(['api', 'error', 'refactor']));
  });
});
