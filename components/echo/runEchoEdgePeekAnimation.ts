import { AccessibilityInfo } from 'react-native';

import { ECHO_EDGE_PEEK_OFFSET_PX } from '../../constants/echoLayer';
import type { StreamEchoPagerHandle } from './StreamEchoPager';

export type RunEchoEdgePeekResult = 'played' | 'skipped_reduce_motion' | 'skipped_no_pager';

export type RunEchoEdgePeekOptions = {
  pager: StreamEchoPagerHandle | null;
  peekPx?: number;
  holdMs?: number;
  /** Production one-time path respects Reduce Motion; dev preview can bypass. */
  respectReduceMotion?: boolean;
};

export async function runEchoEdgePeekAnimation({
  pager,
  peekPx = ECHO_EDGE_PEEK_OFFSET_PX,
  holdMs = 520,
  respectReduceMotion = true,
}: RunEchoEdgePeekOptions): Promise<RunEchoEdgePeekResult> {
  if (pager == null) {
    return 'skipped_no_pager';
  }
  if (respectReduceMotion && (await AccessibilityInfo.isReduceMotionEnabled())) {
    return 'skipped_reduce_motion';
  }

  pager.scrollToStream(false);
  pager.peekEchoEdge(peekPx, true);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, holdMs);
  });
  pager.scrollToStream(true);
  return 'played';
}
