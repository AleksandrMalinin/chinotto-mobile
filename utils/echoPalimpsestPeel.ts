import {
  ECHO_PALIMPSEST_PEEL_DRAG_MAX,
  ECHO_PALIMPSEST_PEEL_RESIST_FACTOR,
  ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY,
} from '../constants/echoLayer';

/** Heavy-handed drag — submerged peel, not elastic pull. */
export function palimpsestPeelDragOffset(dy: number): number {
  if (dy <= 0) {
    return 0;
  }
  const resisted =
    dy <= ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY
      ? dy
      : ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY +
        (dy - ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY) * ECHO_PALIMPSEST_PEEL_RESIST_FACTOR;
  return Math.min(resisted, ECHO_PALIMPSEST_PEEL_DRAG_MAX);
}
