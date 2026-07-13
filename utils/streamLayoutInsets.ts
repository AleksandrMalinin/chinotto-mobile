import { screenContentGutter, screenContentInnerPad } from '../theme';

/** Gutter + entry inset scaled when stream renders in a wider layout (guide preview mock). */
export function resolveStreamLayoutInsets(layoutWidth: number, windowWidth: number) {
  const scale = layoutWidth / windowWidth;
  const streamGutter = Math.round(screenContentGutter(windowWidth) * scale);
  const streamEntryInset = streamGutter + Math.round(screenContentInnerPad * scale);
  return { streamGutter, streamEntryInset };
}
