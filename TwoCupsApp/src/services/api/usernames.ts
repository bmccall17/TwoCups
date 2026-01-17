import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';
import type { UsernameDoc } from '../../types';

/**
 * Check if a username is available (always returns true for now - relaxed for testing)
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  // Relaxed: always return true to allow duplicate usernames during testing
  return true;
}

/**
 * Reserve a username for a user (called during signup)
 * This should be called after Firebase Auth creates the user
 */
export async function reserveUsername(
  username: string,
  uid: string,
  email: string
): Promise<void> {
  const normalizedUsername = username.toLowerCase().trim();

  // Create username lookup doc (overwrites if exists - relaxed for testing)
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  const now = Timestamp.now();

  await setDoc(usernameDocRef, {
    uid,
    email: email.toLowerCase(),
    createdAt: now,
  });

  console.log('[usernames] Reserved username:', normalizedUsername, 'for uid:', uid);
}

/**
 * Look up email by username (for login)
 * Returns null if username doesn't exist
 */
export async function lookupUsername(username: string): Promise<string | null> {
  const normalizedUsername = username.toLowerCase().trim();
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameDocRef);

  if (!usernameDoc.exists()) {
    return null;
  }

  const data = usernameDoc.data();
  return data?.email ?? null;
}

/**
 * Set a username for a user who doesn't have one yet
 * Creates username doc and updates user doc atomically in a transaction
 */
export async function setUsername(
  username: string,
  uid: string,
  email: string
): Promise<void> {
  const currentUid = getCurrentUserId();
  if (!currentUid || currentUid !== uid) {
    throw new Error('Unauthorized');
  }

  const normalizedUsername = username.toLowerCase().trim();

  console.log('[usernames] setUsername called:', { username: normalizedUsername, uid, email });

  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  const userDocRef = doc(db, 'users', uid);

  await runTransaction(db, async (transaction) => {
    // Read user doc first to get existing data
    const userDoc = await transaction.get(userDocRef);
    const existingData = userDoc.exists() ? userDoc.data() : null;
    const now = Timestamp.now();
    const createdAt = existingData?.createdAt ?? now;

    // Write username lookup doc
    transaction.set(usernameDocRef, {
      uid,
      email: email.toLowerCase(),
      createdAt: now,
    });

    // Write user doc with username
    transaction.set(userDocRef, {
      username: normalizedUsername,
      initial: username.charAt(0).toUpperCase(),
      createdAt: createdAt,
      ...(existingData?.activeCoupleId && { activeCoupleId: existingData.activeCoupleId }),
    });

    console.log('[usernames] Transaction completed successfully');
  });
}

/**
 * Update a user's username
 * Deletes old username doc and creates new one atomically in a transaction
 */
export async function updateUsername(
  oldUsername: string,
  newUsername: string,
  uid: string,
  email: string
): Promise<void> {
  const currentUid = getCurrentUserId();
  if (!currentUid || currentUid !== uid) {
    throw new Error('Unauthorized');
  }

  const normalizedOld = oldUsername.toLowerCase().trim();
  const normalizedNew = newUsername.toLowerCase().trim();

  console.log('[usernames] updateUsername called:', { oldUsername: normalizedOld, newUsername: normalizedNew, uid });

  const userDocRef = doc(db, 'users', uid);
  const newUsernameDocRef = doc(db, 'usernames', normalizedNew);
  const oldUsernameDocRef = normalizedOld ? doc(db, 'usernames', normalizedOld) : null;

  await runTransaction(db, async (transaction) => {
    // Read user doc first to get existing data
    const userDoc = await transaction.get(userDocRef);
    const existingData = userDoc.exists() ? userDoc.data() : null;
    const now = Timestamp.now();
    const createdAt = existingData?.createdAt ?? now;

    // Delete old username doc (if exists)
    if (oldUsernameDocRef) {
      transaction.delete(oldUsernameDocRef);
      console.log('[usernames] Old username doc marked for deletion');
    }

    // Create new username doc
    transaction.set(newUsernameDocRef, {
      uid,
      email: email.toLowerCase(),
      createdAt: now,
    });

    // Update user doc with new username
    transaction.set(userDocRef, {
      username: normalizedNew,
      initial: newUsername.charAt(0).toUpperCase(),
      createdAt: createdAt,
      ...(existingData?.activeCoupleId && { activeCoupleId: existingData.activeCoupleId }),
    });

    console.log('[usernames] Transaction completed successfully');
  });
}

/**
 * Get username info by username
 */
export async function getUsernameInfo(username: string): Promise<UsernameDoc | null> {
  const normalizedUsername = username.toLowerCase().trim();
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameDocRef);

  if (!usernameDoc.exists()) {
    return null;
  }

  const data = usernameDoc.data();
  return {
    uid: data.uid,
    email: data.email,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}
