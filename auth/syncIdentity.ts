export type SyncIdentityErrorCode = 'signed_in_other_provider' | 'credential_in_use';

export class SyncIdentityError extends Error {
  constructor(
    public readonly code: SyncIdentityErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SyncIdentityError';
  }
}

/** @deprecated Use SyncIdentityError */
export const AppleSyncIdentityError = SyncIdentityError;

export function providerDisplayName(providerId: string): string {
  if (providerId === 'apple.com') {
    return 'Apple';
  }
  if (providerId === 'google.com') {
    return 'Google';
  }
  return providerId;
}
