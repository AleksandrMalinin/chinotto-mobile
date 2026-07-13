import { render } from '@testing-library/react-native';

import { InterfaceGuideGlyph } from '../InterfaceGuideGlyph';

describe('InterfaceGuideGlyph', () => {
  it('renders the trail glyph', () => {
    const { toJSON } = render(<InterfaceGuideGlyph />);
    expect(toJSON()).toBeTruthy();
  });
});
