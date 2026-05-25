import { Alert } from 'react-native';

import {
  confirmDeleteThought,
  DELETE_THOUGHT_ALERT_MESSAGE,
  DELETE_THOUGHT_ALERT_TITLE,
} from '../confirmDeleteThought';

describe('confirmDeleteThought', () => {
  it('shows cancel and destructive delete actions', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    confirmDeleteThought(onConfirm);

    expect(alertSpy).toHaveBeenCalledWith(
      DELETE_THOUGHT_ALERT_TITLE,
      DELETE_THOUGHT_ALERT_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel', onPress: undefined },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ],
    );
    alertSpy.mockRestore();
  });

  it('runs onConfirm only when Delete is pressed', () => {
    const onConfirm = jest.fn();
    let buttons: { text: string; onPress?: () => void }[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, b) => {
      buttons = b as { text: string; onPress?: () => void }[];
    });

    confirmDeleteThought(onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();

    buttons.find((b) => b.text === 'Delete')?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('runs onCancel when Cancel is pressed', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    let buttons: { text: string; onPress?: () => void }[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, b) => {
      buttons = b as { text: string; onPress?: () => void }[];
    });

    confirmDeleteThought(onConfirm, onCancel);
    buttons.find((b) => b.text === 'Cancel')?.onPress?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
