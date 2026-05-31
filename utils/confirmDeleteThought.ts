import { Alert } from 'react-native';

export const DELETE_THOUGHT_ALERT_TITLE = 'Delete this thought?';
export const DELETE_THOUGHT_ALERT_MESSAGE =
  "This will be deleted on all your devices. It can't be undone.";

/** Native confirm before local delete + tombstone sync. */
export function confirmDeleteThought(onConfirm: () => void, onCancel?: () => void): void {
  Alert.alert(DELETE_THOUGHT_ALERT_TITLE, DELETE_THOUGHT_ALERT_MESSAGE, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
