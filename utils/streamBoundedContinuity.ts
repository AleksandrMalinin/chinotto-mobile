/** True when dev menu has enabled B3/B4/B5 experiments. */
export function isStreamBoundedContinuityActive(devMenuEnabled: boolean): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ && devMenuEnabled;
}
