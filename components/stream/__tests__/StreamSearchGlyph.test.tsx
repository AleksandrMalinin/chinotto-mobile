import { render } from '@testing-library/react-native';

import { StreamSearchGlyph } from '../StreamSearchGlyph';

describe('StreamSearchGlyph', () => {
  it('renders custom loupe mark', () => {
    const { toJSON } = render(<StreamSearchGlyph color="#aab" />);
    expect(toJSON()).toBeTruthy();
  });
});
