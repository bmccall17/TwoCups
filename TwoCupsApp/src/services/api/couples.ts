import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  arrayUnion,
  collection,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';
import {
  validateDisplayNameServer,
  validateInitialServer,
  validateInviteCodeServer,
} from '../../utils/validation';

// Configuration
const INVITE_CODE_EXPIRATION_HOURS = 72;
const DEFAULT_POINTS_PER_ACK = 5;

// Generate 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface CreateCoupleParams {
  displayName: string;
  initial: string;
}

export interface CreateCoupleResult {
  coupleId: string;
  inviteCode: string;
}

export interface JoinCoupleParams {
  inviteCode: string;
  displayName: string;
  initial: string;
}

export interface JoinCoupleResult {
  coupleId: string;
  partnerId: string;
  partnerName: string;
}

/**
 * Create a new couple with the current user as first partner
 */
export async function createCouple(params: CreateCoupleParams): Promise<CreateCoupleResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { displayName, initial } = params;

  // Validate and sanitize input (server-side)
  const sanitizedDisplayName = validateDisplayNameServer(displayName);
  const sanitizedInitial = validateInitialServer(initial);

  // Check if user already has an active couple
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    if (userData?.activeCoupleId) {
      throw new Error('You are already in a couple');
    }
  }

  // Generate unique invite code
  let inviteCode: string = '';
  let inviteCodeExists = true;
  while (inviteCodeExists) {
    inviteCode = generateInviteCode();
    const inviteDocRef = doc(db, 'inviteCodes', inviteCode);
    const existing = await getDoc(inviteDocRef);
    inviteCodeExists = existing.exists();
  }

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + INVITE_CODE_EXPIRATION_HOURS * 60 * 60 * 1000)
  );

  // Create couple document with auto-generated ID
  const coupleDocRef = doc(collection(db, 'couples'));
  const coupleId = coupleDocRef.id;

  const batch = writeBatch(db);

  // Create couple
  batch.set(coupleDocRef, {
    partnerIds: [uid],
    status: 'pending',
    inviteCode,
    pointsPerAcknowledgment: DEFAULT_POINTS_PER_ACK,
    collectiveCupLevel: 0,
    createdAt: now,
    lastActivityAt: now,
  });

  // Create player document
  const playerDocRef = doc(db, 'couples', coupleId, 'players', uid);
  batch.set(playerDocRef, {
    cupLevel: 0,
    gemCount: 0,
    joinedAt: now,
  });

  // Create/update user document
  if (userDoc.exists()) {
    batch.update(userDocRef, {
      displayName: sanitizedDisplayName,
      initial: sanitizedInitial,
      activeCoupleId: coupleId,
    });
  } else {
    batch.set(userDocRef, {
      displayName: sanitizedDisplayName,
      initial: sanitizedInitial,
      activeCoupleId: coupleId,
      createdAt: now,
    });
  }

  // Create invite code document
  const inviteCodeDocRef = doc(db, 'inviteCodes', inviteCode);
  batch.set(inviteCodeDocRef, {
    coupleId,
    creatorId: uid,
    status: 'active',
    createdAt: now,
    expiresAt,
  });

  await batch.commit();

  return {
    coupleId,
    inviteCode,
  };
}

/**
 * Join an existing couple using an invite code
 */
export async function joinCouple(params: JoinCoupleParams): Promise<JoinCoupleResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { inviteCode, displayName, initial } = params;

  // Validate and sanitize input (server-side)
  const sanitizedInviteCode = validateInviteCodeServer(inviteCode);
  const sanitizedDisplayName = validateDisplayNameServer(displayName);
  const sanitizedInitial = validateInitialServer(initial);

  // Check if user already has an active couple
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    if (userData?.activeCoupleId) {
      throw new Error('You are already in a couple');
    }
  }

  // Validate invite code
  const inviteDocRef = doc(db, 'inviteCodes', sanitizedInviteCode);
  const inviteDoc = await getDoc(inviteDocRef);

  if (!inviteDoc.exists()) {
    throw new Error('Invalid invite code');
  }

  const inviteData = inviteDoc.data();
  if (!inviteData) {
    throw new Error('Invalid invite code');
  }

  if (inviteData.status !== 'active') {
    throw new Error('Invite code has already been used');
  }

  if (inviteData.expiresAt.toDate() < new Date()) {
    throw new Error('Invite code has expired');
  }

  if (inviteData.creatorId === uid) {
    throw new Error('Cannot join your own couple');
  }

  // Get couple and verify it only has one partner
  const coupleDocRef = doc(db, 'couples', inviteData.coupleId);
  const coupleDoc = await getDoc(coupleDocRef);

  if (!coupleDoc.exists()) {
    throw new Error('Couple not found');
  }

  const coupleData = coupleDoc.data();
  if (!coupleData) {
    throw new Error('Couple not found');
  }

  if (coupleData.partnerIds.length >= 2) {
    throw new Error('Couple already has two partners');
  }

  // Get partner info for response
  const partnerId = coupleData.partnerIds[0];
  const partnerDocRef = doc(db, 'users', partnerId);
  const partnerDoc = await getDoc(partnerDocRef);
  const partnerData = partnerDoc.data();

  const now = Timestamp.now();

  // Join couple in a batch
  const batch = writeBatch(db);

  // Update couple - add second partner
  batch.update(coupleDocRef, {
    partnerIds: arrayUnion(uid),
    status: 'active',
    lastActivityAt: now,
  });

  // Create player document for joining user
  const playerDocRef = doc(db, 'couples', inviteData.coupleId, 'players', uid);
  batch.set(playerDocRef, {
    cupLevel: 0,
    gemCount: 0,
    joinedAt: now,
  });

  // Create/update user document
  if (userDoc.exists()) {
    batch.update(userDocRef, {
      displayName: sanitizedDisplayName,
      initial: sanitizedInitial,
      activeCoupleId: inviteData.coupleId,
    });
  } else {
    batch.set(userDocRef, {
      displayName: sanitizedDisplayName,
      initial: sanitizedInitial,
      activeCoupleId: inviteData.coupleId,
      createdAt: now,
    });
  }

  // Mark invite code as used
  batch.update(inviteDocRef, { 
    status: 'used',
    usedBy: uid,
    usedAt: now,
  });

  await batch.commit();

  return {
    coupleId: inviteData.coupleId,
    partnerId,
    partnerName: partnerData?.displayName ?? 'Partner',
  };
}
