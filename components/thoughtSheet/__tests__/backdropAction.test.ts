import {
  thoughtSheetBackdropAction,
  thoughtSheetBackdropA11yLabel,
} from '../backdropAction';

describe('thoughtSheet backdropAction', () => {
  it('always dismisses the sheet', () => {
    expect(thoughtSheetBackdropAction()).toBe('close');
    expect(thoughtSheetBackdropA11yLabel()).toBe('Dismiss');
  });
});
