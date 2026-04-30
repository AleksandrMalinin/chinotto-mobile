const mockDeleteAll = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockCleanup = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockReauth = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockDeleteUser = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockSignOut = jest.fn((..._args: unknown[]) => Promise.resolve());

jest.mock('../firebaseConfig', () => ({
  isFirebaseSyncConfigured: jest.fn(() => true),
}));

const mockAuth: { currentUser: { uid: string; isAnonymous: boolean } | null } = {
  currentUser: { uid: 'test-uid', isAnonymous: false },
};

jest.mock('../firebaseAuth', () => ({
  getOrInitAuth: jest.fn(() => mockAuth),
  firebaseAuthErrorCode: (e: unknown) =>
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '',
}));

jest.mock('../deleteUserFirestoreData', () => ({
  deleteAllFirestoreDataForUid: (uid: string) => mockDeleteAll(uid),
}));

jest.mock('../accountDeletionCleanup', () => ({
  cleanupLocalSyncStateAfterAccountDeletion: () => mockCleanup(),
}));

jest.mock('../../auth/reauthenticateApple', () => ({
  reauthenticateCurrentUserWithApple: () => mockReauth(),
}));

jest.mock('firebase/auth', () => ({
  deleteUser: (u: unknown) => mockDeleteUser(u),
  signOut: (a: unknown) => mockSignOut(a),
}));

import {
  AccountDeletionNeedsRecentLogin,
  DeleteChinottoAccountError,
  deleteChinottoAccountForCurrentUser,
  resumeChinottoAccountDeletionAfterReauth,
} from '../deleteChinottoAccount';

describe('deleteChinottoAccountForCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-uid', isAnonymous: false };
    mockDeleteUser.mockImplementation(async () => {
      mockAuth.currentUser = null;
    });
  });

  it('throws not_signed_in when user is anonymous', async () => {
    mockAuth.currentUser = { uid: 'anon', isAnonymous: true };
    const err = await deleteChinottoAccountForCurrentUser().then(
      () => {
        throw new Error('expected rejection');
      },
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(DeleteChinottoAccountError);
    expect(err).toMatchObject({ failure: 'not_signed_in' });
    expect(mockDeleteAll).not.toHaveBeenCalled();
  });

  it('removes Firestore data, deletes auth user, then cleans local sync state', async () => {
    await deleteChinottoAccountForCurrentUser();

    expect(mockDeleteAll).toHaveBeenCalledWith('test-uid');
    expect(mockDeleteUser).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('throws AccountDeletionNeedsRecentLogin when deleteUser requires recent login', async () => {
    mockDeleteUser.mockRejectedValueOnce(Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' }));

    await expect(deleteChinottoAccountForCurrentUser()).rejects.toBeInstanceOf(AccountDeletionNeedsRecentLogin);
    expect(mockDeleteAll).toHaveBeenCalledWith('test-uid');
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('treats auth/user-not-found as success path with cleanup', async () => {
    mockDeleteUser.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'auth/user-not-found' }));

    await deleteChinottoAccountForCurrentUser();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });
});

describe('resumeChinottoAccountDeletionAfterReauth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-uid', isAnonymous: false };
    mockDeleteUser.mockImplementation(async () => {
      mockAuth.currentUser = null;
    });
  });

  it('reauthenticates then deletes user and cleans up', async () => {
    await resumeChinottoAccountDeletionAfterReauth();

    expect(mockReauth).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('cleans up when session is already cleared', async () => {
    mockAuth.currentUser = null;

    await resumeChinottoAccountDeletionAfterReauth();

    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });
});
