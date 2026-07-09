import type { Auth, AuthCredential } from 'firebase/auth';
import { linkWithCredential } from 'firebase/auth';

import { linkOAuthProviderToCurrentUser } from '../linkOAuthProvider';

jest.mock('firebase/auth', () => ({
  linkWithCredential: jest.fn(),
}));

const mockLinkWithCredential = jest.mocked(linkWithCredential);

function mockAuth(
  user: {
    isAnonymous: boolean;
    providerData: { providerId: string }[];
  } | null
): Auth {
  return { currentUser: user } as Auth;
}

const credential = { providerId: 'google.com' } as AuthCredential;

describe('linkOAuthProviderToCurrentUser', () => {
  beforeEach(() => {
    mockLinkWithCredential.mockReset();
  });

  it('returns already_linked when provider is in providerData', async () => {
    const auth = mockAuth({
      isAnonymous: false,
      providerData: [{ providerId: 'google.com' }],
    });

    await expect(linkOAuthProviderToCurrentUser(auth, credential, 'google.com')).resolves.toBe(
      'already_linked'
    );
    expect(mockLinkWithCredential).not.toHaveBeenCalled();
  });

  it('links when provider is not yet linked', async () => {
    const auth = mockAuth({
      isAnonymous: false,
      providerData: [{ providerId: 'apple.com' }],
    });
    mockLinkWithCredential.mockResolvedValue({} as never);

    await expect(linkOAuthProviderToCurrentUser(auth, credential, 'google.com')).resolves.toBe(
      'linked'
    );
    expect(mockLinkWithCredential).toHaveBeenCalledWith(auth.currentUser, credential);
  });

  it('maps auth/credential-already-in-use to SyncIdentityError', async () => {
    const auth = mockAuth({
      isAnonymous: false,
      providerData: [{ providerId: 'apple.com' }],
    });
    mockLinkWithCredential.mockRejectedValue({ code: 'auth/credential-already-in-use' });

    await expect(linkOAuthProviderToCurrentUser(auth, credential, 'google.com')).rejects.toMatchObject({
      code: 'credential_in_use',
    });
  });

  it('returns already_linked on auth/provider-already-linked from Firebase', async () => {
    const auth = mockAuth({
      isAnonymous: false,
      providerData: [{ providerId: 'apple.com' }],
    });
    mockLinkWithCredential.mockRejectedValue({ code: 'auth/provider-already-linked' });

    await expect(linkOAuthProviderToCurrentUser(auth, credential, 'google.com')).resolves.toBe(
      'already_linked'
    );
  });

  it('throws when user is anonymous', async () => {
    const auth = mockAuth({ isAnonymous: true, providerData: [] });

    await expect(linkOAuthProviderToCurrentUser(auth, credential, 'google.com')).rejects.toThrow(
      'Sign in before linking'
    );
  });
});
