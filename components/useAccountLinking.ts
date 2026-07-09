import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { linkAppleInSettings, AppleUserCanceledError } from '../auth/linkAppleInSettings';
import { linkGoogleInSettings, GoogleUserCanceledError } from '../auth/linkGoogleInSettings';
import { SyncIdentityError } from '../auth/syncIdentity';
import { track } from '../analytics/analytics';

export function useAccountLinking(): {
  busy: boolean;
  error: string | null;
  onLinkApple: () => Promise<void>;
  onLinkGoogle: () => Promise<void>;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLinkApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await linkAppleInSettings();
      track({ event: 'sync_account_link_outcome', provider: 'apple', outcome: 'success' });
    } catch (e: unknown) {
      if (e instanceof AppleUserCanceledError) {
        return;
      }
      track({ event: 'sync_account_link_outcome', provider: 'apple', outcome: 'error' });
      if (e instanceof SyncIdentityError || e instanceof Error) {
        setError(e.message);
      } else {
        setError('Could not link Apple. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const onLinkGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await linkGoogleInSettings();
      track({ event: 'sync_account_link_outcome', provider: 'google', outcome: 'success' });
    } catch (e: unknown) {
      if (e instanceof GoogleUserCanceledError) {
        return;
      }
      track({ event: 'sync_account_link_outcome', provider: 'google', outcome: 'error' });
      if (e instanceof SyncIdentityError || e instanceof Error) {
        setError(e.message);
      } else {
        setError('Could not link Google. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, onLinkApple, onLinkGoogle };
}
