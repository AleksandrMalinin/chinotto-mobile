/** Tap outside the sheet always dismisses it (save-on-close handles any draft). */
export type ThoughtSheetBackdropAction = 'close';

export function thoughtSheetBackdropAction(): ThoughtSheetBackdropAction {
  return 'close';
}

export function thoughtSheetBackdropA11yLabel(): string {
  return 'Dismiss';
}
