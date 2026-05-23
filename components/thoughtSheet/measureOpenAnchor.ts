import type { View } from 'react-native';

import type { ThoughtSheetOpenAnchor } from './detents';

export function measureThoughtSheetOpenAnchor(
  view: View | null,
  callback: (anchor?: ThoughtSheetOpenAnchor) => void
): void {
  if (view == null) {
    callback(undefined);
    return;
  }
  const measure = view.measureInWindow?.bind(view);
  if (typeof measure !== 'function') {
    callback(undefined);
    return;
  }

  let settled = false;
  const finish = (anchor?: ThoughtSheetOpenAnchor) => {
    if (settled) {
      return;
    }
    settled = true;
    callback(anchor);
  };

  measure((_x, pageY, _width, height) => {
    finish({ pageY, height });
  });

  // Jest's test renderer often never invokes measureInWindow callbacks.
  if (process.env.NODE_ENV === 'test') {
    setTimeout(() => finish(undefined), 0);
  }
}
