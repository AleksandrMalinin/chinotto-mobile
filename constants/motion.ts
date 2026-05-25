/**
 * Shared motion scale — emotionally restrained pacing (HWF-inspired), per surface.
 * Prefer these tiers over one-off millisecond literals in UI code.
 */
export const motion = {
  capture: {
    standard: 180,
    relaxed: 220,
  },
  stream: {
    focusOpacity: 280,
    focusOpacitySnap: 0,
    pressIn: 100,
    pressOut: 180,
    scrollStateThrottle: 64,
    focusSnapVelocity: 0.12,
    loadMoreLookahead: 320,
    emptyHintEntrance: 1200,
    emptyHintStagger: 300,
    emptyHintYOffset: 7,
    emptyAmbientBeforeCopy: 1150,
    emptyAmbientSuppressFade: 360,
  },
  echo: {
    contentFade: 420,
    recallDimIn: 220,
    recallDimOut: 280,
    recallDimOutDelay: 50,
    pagerRevealIn: 320,
    pagerRevealOut: 280,
    presenceSettle: 420,
    palimpsestPressIn: 120,
    palimpsestPressOut: 220,
    palimpsestPeelLongPress: 550,
    sheetEnter: 380,
  },
  sheet: {
    streamSpring: { damping: 30, stiffness: 170, mass: 1 },
  },
} as const;
