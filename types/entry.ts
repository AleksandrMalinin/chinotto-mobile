export type Entry = {
  id: string;
  text: string;
  createdAt: string;
  /**
   * Important marker; same boolean field as desktop + Firestore `users/{uid}/entries/{id}.pinned`.
   * Omitted or false = not pinned.
   */
  pinned?: boolean;
};
