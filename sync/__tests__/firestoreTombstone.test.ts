jest.mock('firebase/firestore', () => {
  class Timestamp {
    seconds: number;
    nanoseconds: number;
    static fromMillis(ms: number) {
      const s = Math.floor(ms / 1000);
      return new Timestamp(s, (ms % 1000) * 1_000_000);
    }
    constructor(sec: number, nano: number) {
      this.seconds = sec;
      this.nanoseconds = nano;
    }
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1_000_000);
    }
  }
  return { Timestamp };
});

import { Timestamp } from 'firebase/firestore';

import { isFirestoreDocumentTombstoned } from '../firestoreTombstone';

describe('isFirestoreDocumentTombstoned', () => {
  it('treats missing deletedAt as active (legacy doc)', () => {
    expect(isFirestoreDocumentTombstoned({ text: 'a', createdAt: '2025-01-01T00:00:00.000Z' })).toBe(false);
  });

  it('treats null deletedAt as active', () => {
    expect(isFirestoreDocumentTombstoned({ deletedAt: null })).toBe(false);
  });

  it('treats Timestamp with toDate as tombstoned', () => {
    expect(
      isFirestoreDocumentTombstoned({
        deletedAt: { toDate: () => new Date('2025-03-01T12:00:00.000Z') },
      })
    ).toBe(true);
  });

  it('treats plain seconds shape as tombstoned', () => {
    expect(isFirestoreDocumentTombstoned({ deletedAt: { seconds: 1_740_000_000 } })).toBe(true);
  });

  it('detects Firestore Timestamp instance', () => {
    expect(
      isFirestoreDocumentTombstoned({
        deletedAt: Timestamp.fromMillis(1_740_000_000_000),
      })
    ).toBe(true);
  });

  it('detects non-empty string deletedAt', () => {
    expect(isFirestoreDocumentTombstoned({ deletedAt: '2025-03-01T12:00:00.000Z' })).toBe(true);
  });
});
