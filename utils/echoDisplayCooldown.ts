import {
  ECHO_DISPLAY_COOLDOWN_DAYS,
  ECHO_DISPLAY_COOLDOWN_OPENED_DAYS,
  ECHO_UNFINISHED_OPEN_MIN,
} from '../constants/echoLayer';

/** Days to hide an entry from Echo after it was shown (engagement-aware). */
export function echoDisplayCooldownDays(openCount: number, editCount: number): number {
  if (openCount >= ECHO_UNFINISHED_OPEN_MIN && editCount === 0) {
    return ECHO_DISPLAY_COOLDOWN_OPENED_DAYS;
  }
  return ECHO_DISPLAY_COOLDOWN_DAYS;
}
