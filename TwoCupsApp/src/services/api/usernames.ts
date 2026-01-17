import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
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
 * Creates username doc and updates user doc
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
  const now = Timestamp.now();

  console.log('[usernames] setUsername called:', { username: normalizedUsername, uid, email });

  // Step 1: Create/update username lookup doc
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  try {
    await setDoc(usernameDocRef, {
      uid,
      email: email.toLowerCase(),
      createdAt: now,
    });
    console.log('[usernames] Username doc created successfully');
  } catch (error) {
    console.error('[usernames] Failed to create username doc:', error);
    throw error;
  }

  // Step 2: Update user document with username
  const userDocRef = doc(db, 'users', uid);
  try {
    await setDoc(userDocRef, {
      username: normalizedUsername,
      initial: username.charAt(0).toUpperCase(),
    }, { merge: true }); // Use merge to preserve other fields
    console.log('[usernames] User doc updated successfully');
  } catch (error) {
    console.error('[usernames] Failed to update user doc:', error);
    throw error;
  }
}

/**
 * Update a user's username
 * Deletes old username doc and creates new one
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

  const now = Timestamp.now();

  // Step 1: Delete old username doc (if exists)
  if (normalizedOld) {
    const oldUsernameDocRef = doc(db, 'usernames', normalizedOld);
    try {
      await deleteDoc(oldUsernameDocRef);
      console.log('[usernames] Old username doc deleted');
    } catch (error) {
      console.error('[usernames] Failed to delete old username doc (may not exist):', error);
      // Continue anyway - old doc might not exist
    }
  }

  // Step 2: Create new username doc
  const newUsernameDocRef = doc(db, 'usernames', normalizedNew);
  try {
    await setDoc(newUsernameDocRef, {
      uid,
      email: email.toLowerCase(),
      createdAt: now,
    });
    console.log('[usernames] New username doc created');
  } catch (error) {
    console.error('[usernames] Failed to create new username doc:', error);
    throw error;
  }

  // Step 3: Update user document with new username
  const userDocRef = doc(db, 'users', uid);
  try {
    await setDoc(userDocRef, {
      username: normalizedNew,
    }, { merge: true });
    console.log('[usernames] User doc updated with new username');
  } catch (error) {
    console.error('[usernames] Failed to update user doc:', error);
    throw error;
  }
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
