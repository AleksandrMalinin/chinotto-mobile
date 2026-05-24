import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearEchoEdgePeekDone,
  getEchoEdgePeekDone,
  setEchoEdgePeekDone,
} from '../echoLayerPrefs';

describe('echoLayerPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks one-time echo edge peek', async () => {
    expect(await getEchoEdgePeekDone()).toBe(false);
    await setEchoEdgePeekDone();
    expect(await getEchoEdgePeekDone()).toBe(true);
  });

  it('clears edge peek for dev QA', async () => {
    await setEchoEdgePeekDone();
    await clearEchoEdgePeekDone();
    expect(await getEchoEdgePeekDone()).toBe(false);
  });
});
