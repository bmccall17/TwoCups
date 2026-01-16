import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';
import type { UsernameDoc } from '../../types';

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase().trim();
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameDocRef);
  return !usernameDoc.exists();
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
  const usernameDocRef = doc(db, 'usernames', normalizedUsername);

  // Check if already exists
  const existing = await getDoc(usernameDocRef);
  if (existing.exists()) {
    throw new Error('Username is already taken');
  }

  const now = Timestamp.now();
  const usernameData: UsernameDoc = {
    uid,
    email: email.toLowerCase(),
    createdAt: now.toDate(),
  };

  await setDoc(usernameDocRef, {
    ...usernameData,
    createdAt: now,
  });
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
 * Update a user's username
 * Deletes old username doc and creates new one atomically
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

  if (normalizedOld === normalizedNew) {
    throw new Error('New username is the same as current username');
  }

  // Check new username is available
  const newUsernameDocRef = doc(db, 'usernames', normalizedNew);
  const existingNew = await getDoc(newUsernameDocRef);
  if (existingNew.exists()) {
    throw new Error('Username is already taken');
  }

  // Verify old username belongs to this user
  const oldUsernameDocRef = doc(db, 'usernames', normalizedOld);
  const existingOld = await getDoc(oldUsernameDocRef);
  if (!existingOld.exists()) {
    throw new Error('Current username not found');
  }
  const oldData = existingOld.data();
  if (oldData?.uid !== uid) {
    throw new Error('Unauthorized - username does not belong to you');
  }

  const now = Timestamp.now();

  // Use batch to atomically delete old and create new
  const batch = writeBatch(db);

  // Delete old username doc
  batch.delete(oldUsernameDocRef);

  // Create new username doc
  batch.set(newUsernameDocRef, {
    uid,
    email: email.toLowerCase(),
    createdAt: now,
  });

  // Update user document with new username
  const userDocRef = doc(db, 'users', uid);
  batch.update(userDocRef, {
    username: normalizedNew,
  });

  await batch.commit();
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
