import {
  COMPOSER_ACTION_CLUSTER_WIDTH,
  composerActionClusterExpanded,
} from '../composerActionCluster';

describe('composerActionClusterExpanded', () => {
  it('keeps the voice mic visible on an empty field', () => {
    expect(composerActionClusterExpanded('', 'idle')).toBe(true);
    expect(composerActionClusterExpanded('   ', 'idle')).toBe(true);
  });

  it('keeps the voice mic visible while the user is typing', () => {
    expect(composerActionClusterExpanded('a', 'idle')).toBe(true);
    expect(composerActionClusterExpanded('  jot  ', 'idle')).toBe(true);
  });

  it('keeps the cluster visible while voice capture is active', () => {
    expect(composerActionClusterExpanded('', 'listening')).toBe(true);
    expect(composerActionClusterExpanded('spoken draft', 'listening')).toBe(true);
  });
});

describe('COMPOSER_ACTION_CLUSTER_WIDTH', () => {
  it('reserves the voice mic plus glow overflow padding', () => {
    expect(COMPOSER_ACTION_CLUSTER_WIDTH).toBe(60);
  });
});
