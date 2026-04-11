import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ANALYTICS_PROMPT_SHOWN_KEY,
  clearAnalyticsPromptShown,
  getAnalyticsPromptShown,
  initAnalyticsOptIn,
  isOptIn,
  setAnalyticsPromptShown,
  setOptIn,
  setUmami,
  track,
} from '../analytics';

describe('analytics (Umami client)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    setUmami(null, null);
    setOptIn(false);
  });

  it('initAnalyticsOptIn reads storage into isOptIn', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('true');
    const v = await initAnalyticsOptIn();
    expect(v).toBe(true);
    expect(isOptIn()).toBe(true);
  });

  it('track does not fetch when opted out', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
    setUmami('https://analytics.example.com', 'site-id');
    setOptIn(false);
    track({ event: 'sync_modal_opened', surface: 'header' });
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('getAnalyticsPromptShown / setAnalyticsPromptShown use the shared key', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    expect(await getAnalyticsPromptShown()).toBe(false);
    await setAnalyticsPromptShown();
    expect(jest.mocked(AsyncStorage.setItem)).toHaveBeenCalledWith(ANALYTICS_PROMPT_SHOWN_KEY, 'true');
  });

  it('clearAnalyticsPromptShown removes the prompt key', async () => {
    await clearAnalyticsPromptShown();
    expect(jest.mocked(AsyncStorage.removeItem)).toHaveBeenCalledWith(ANALYTICS_PROMPT_SHOWN_KEY);
  });

  it('track sends after batch interval when opted in and Umami is configured', () => {
    jest.useFakeTimers();
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
    setUmami('https://analytics.example.com', 'site-id');
    setOptIn(true);
    track({ event: 'sync_paywall_shown' });
    jest.advanceTimersByTime(2100);
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
