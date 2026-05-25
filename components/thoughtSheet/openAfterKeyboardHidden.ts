import { Keyboard, Platform } from 'react-native';

/** Wait for the composer keyboard to finish hiding before opening a modal sheet on iOS. */
export function openAfterKeyboardHidden(onOpen: () => void): () => void {
  if (Platform.OS !== 'ios') {
    onOpen();
    return () => {};
  }

  let settled = false;
  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    onOpen();
  };

  const metrics = Keyboard.metrics();
  if (metrics == null || metrics.height <= 0) {
    requestAnimationFrame(finish);
    return () => {};
  }

  const subWillHide = Keyboard.addListener('keyboardWillHide', finish);
  const subDidHide = Keyboard.addListener('keyboardDidHide', finish);
  const timeout = setTimeout(finish, 280);
  return () => {
    subWillHide.remove();
    subDidHide.remove();
    clearTimeout(timeout);
  };
}
