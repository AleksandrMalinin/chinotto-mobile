import type { Auth, AuthCredential } from 'firebase/auth';
import { linkWithCredential, signInWithCredential } from 'firebase/auth';

import {
  AppleSyncIdentityError,
  applyAppleCredentialToFirebase,
} from '../appleFirebaseAuth';

jest.mock('firebase/auth', () => ({
  linkWithCredential: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(() => Promise.resolve()),
}));

const mockLink = jest.mocked(linkWithCredential);
const mockSignIn = jest.mocked(signInWithCredential);

describe('applyAppleCredentialToFirebase', () => {
  const cred = {} as AuthCredential;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links when current user is anonymous', async () => {
    const user = { isAnonymous: true, providerData: [] };
    const auth = { currentUser: user } as unknown as Auth;

    const result = await applyAppleCredentialToFirebase(auth, cred);

    expect(result).toEqual({ kind: 'linked' });
    expect(mockLink).toHaveBeenCalledWith(user, cred);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in when no current user', async () => {
    const auth = { currentUser: null } as unknown as Auth;

    const result = await applyAppleCredentialToFirebase(auth, cred);

    expect(result).toEqual({ kind: 'signed_in' });
    expect(mockSignIn).toHaveBeenCalledWith(auth, cred);
    expect(mockLink).not.toHaveBeenCalled();
  });

  it('no-ops when Apple is already linked', async () => {
    const user = {
      isAnonymous: false,
      providerData: [{ providerId: 'apple.com' }],
    };
    const auth = { currentUser: user } as unknown as Auth;

    const result = await applyAppleCredentialToFirebase(auth, cred);

    expect(result).toEqual({ kind: 'already_apple' });
    expect(mockLink).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('throws when signed in with another provider only', async () => {
    const user = {
      isAnonymous: false,
      providerData: [{ providerId: 'google.com' }],
    };
    const auth = { currentUser: user } as unknown as Auth;

    await expect(applyAppleCredentialToFirebase(auth, cred)).rejects.toThrow(AppleSyncIdentityError);
    expect(mockLink).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
