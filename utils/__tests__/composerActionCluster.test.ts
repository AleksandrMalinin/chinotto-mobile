import {
  COMPOSER_ACTION_CLUSTER_WIDTH,
  composerActionClusterExpanded,
} from '../composerActionCluster';

describe('composerActionClusterExpanded', () => {
  it('shows the cluster on an empty capture field', () => {
    expect(composerActionClusterExpanded('', 'idle')).toBe(true);
    expect(composerActionClusterExpanded('   ', 'idle')).toBe(true);
  });

  it('hides the cluster while the user is typing', () => {
    expect(composerActionClusterExpanded('a', 'idle')).toBe(false);
    expect(composerActionClusterExpanded('  jot  ', 'idle')).toBe(false);
  });

  it('keeps the cluster visible while voice capture is active', () => {
    expect(composerActionClusterExpanded('', 'listening')).toBe(true);
    expect(composerActionClusterExpanded('spoken draft', 'listening')).toBe(true);
  });
});

describe('COMPOSER_ACTION_CLUSTER_WIDTH', () => {
  it('reserves the voice mic only', () => {
    expect(COMPOSER_ACTION_CLUSTER_WIDTH).toBe(42);
  });
});
