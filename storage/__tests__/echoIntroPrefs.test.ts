import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearEchoIntroSeen, getEchoIntroSeen, setEchoIntroSeen } from '../echoIntroPrefs';

describe('echoIntroPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks echo intro seen state', async () => {
    expect(await getEchoIntroSeen()).toBe(false);
    await setEchoIntroSeen();
    expect(await getEchoIntroSeen()).toBe(true);
  });

  it('clears echo intro for dev QA', async () => {
    await setEchoIntroSeen();
    await clearEchoIntroSeen();
    expect(await getEchoIntroSeen()).toBe(false);
  });
});
