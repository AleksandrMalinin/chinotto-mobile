import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

import {
  shouldCollapseExpandedThoughtSheet,
  shouldDismissExpandedThoughtSheet,
  shouldDismissThoughtSheet,
  shouldExpandThoughtSheet,
} from './detents';

type SheetPanMode = 'compact' | 'expanded';

type UseSheetPanActionsOptions = {
  mode: SheetPanMode;
  scrollYRef: RefObject<number>;
  onExpand: () => void;
  onCollapse: () => void;
  onDismiss: () => void;
};

export function useSheetPanActions({
  mode,
  scrollYRef,
  onExpand,
  onCollapse,
  onDismiss,
}: UseSheetPanActionsOptions) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationY, velocityY } = event.nativeEvent;
      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
        return;
      }

      if (modeRef.current === 'compact') {
        if ((scrollYRef.current ?? 0) > 4 && translationY > 0) {
          return;
        }
        if (shouldExpandThoughtSheet(translationY, velocityY)) {
          onExpand();
          return;
        }
        if (shouldDismissThoughtSheet(translationY, velocityY)) {
          onDismiss();
        }
        return;
      }

      if (shouldDismissExpandedThoughtSheet(translationY, velocityY)) {
        onDismiss();
        return;
      }
      if (shouldCollapseExpandedThoughtSheet(translationY, velocityY)) {
        onCollapse();
      }
    },
    [onCollapse, onDismiss, onExpand, scrollYRef]
  );

  return { onHandlerStateChange };
}
