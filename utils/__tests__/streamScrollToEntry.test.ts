import { streamScrollContentYForRow } from '../streamScrollToEntry';

describe('streamScrollContentYForRow', () => {
  it('adds viewport delta to current scroll offset', () => {
    expect(
      streamScrollContentYForRow(
        120,
        { y: 200 },
        { y: 560 },
        24,
      ),
    ).toBe(120 + (560 - 200) - 24);
  });

  it('never returns negative Y', () => {
    expect(streamScrollContentYForRow(0, { y: 400 }, { y: 300 }, 24)).toBe(0);
  });
});
