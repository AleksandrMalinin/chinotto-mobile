import { mergeVoiceTranscript } from '../mergeVoiceTranscript';

describe('mergeVoiceTranscript', () => {
  it('returns spoken text when previous is empty', () => {
    expect(mergeVoiceTranscript('', '  hello  ')).toBe('hello');
  });

  it('appends with a single space when both sides have content', () => {
    expect(mergeVoiceTranscript('alpha', 'beta')).toBe('alpha beta');
  });

  it('trims previous and avoids double space', () => {
    expect(mergeVoiceTranscript('  alpha  ', 'beta')).toBe('alpha beta');
  });

  it('returns previous when spoken is empty or whitespace', () => {
    expect(mergeVoiceTranscript('alpha', '')).toBe('alpha');
    expect(mergeVoiceTranscript('alpha', '   ')).toBe('alpha');
  });
});
