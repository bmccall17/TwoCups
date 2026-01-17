import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  arrayUnion,
  collection,
  runTransaction,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';
import {
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
  initial: string;
}

export interface CreateCoupleResult {
  coupleId: string;
  inviteCode: string;
}

export interface JoinCoupleParams {
  inviteCode: string;
  initial: string;
}

export interface JoinCoupleResult {
  coupleId: string;
  partnerId: string;
  partnerName: string;
}

/**
 * Create a new couple with the current user as first partner
 * Uses transaction to atomically check invite code uniqueness and create all docs
 */
export async function createCouple(params: CreateCoupleParams): Promise<CreateCoupleResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { initial } = params;

  // Validate and sanitize input (server-side)
  const sanitizedInitial = validateInitialServer(initial);

  const userDocRef = doc(db, 'users', uid);

  // Pre-generate couple ID outside transaction
  const coupleDocRef = doc(collection(db, 'couples'));
  const coupleId = coupleDocRef.id;

  // Try up to 5 times to find unique invite code
  const MAX_RETRIES = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const inviteCode = generateInviteCode();
    const inviteCodeDocRef = doc(db, 'inviteCodes', inviteCode);

    try {
      await runTransaction(db, async (transaction) => {
        // Read all docs first
        const userDoc = await transaction.get(userDocRef);
        const inviteDoc = await transaction.get(inviteCodeDocRef);

        // Check if user already has an active couple
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.activeCoupleId) {
            throw new Error('You are already in a couple');
          }
        }

        // Check if invite code already exists (race condition protection)
        if (inviteDoc.exists()) {
          throw new Error('INVITE_CODE_EXISTS');
        }

        const now = Timestamp.now();
        const expiresAt = Timestamp.fromDate(
          new Date(Date.now() + INVITE_CODE_EXPIRATION_HOURS * 60 * 60 * 1000)
        );

        // Create couple
        transaction.set(coupleDocRef, {
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
        transaction.set(playerDocRef, {
          cupLevel: 0,
          gemCount: 0,
          joinedAt: now,
        });

        // Update user document with initial and coupleId
        transaction.update(userDocRef, {
          initial: sanitizedInitial,
          activeCoupleId: coupleId,
        });

        // Create invite code document
        transaction.set(inviteCodeDocRef, {
          coupleId,
          creatorId: uid,
          status: 'active',
          createdAt: now,
          expiresAt,
        });
      });

      // Transaction succeeded
      return {
        coupleId,
        inviteCode,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'INVITE_CODE_EXISTS') {
        // Retry with new invite code
        lastError = error;
        continue;
      }
      // Other error - rethrow
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate unique invite code');
}

/**
 * Join an existing couple using an invite code
 * Uses transaction to atomically validate and join
 */
export async function joinCouple(params: JoinCoupleParams): Promise<JoinCoupleResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { inviteCode, initial } = params;

  // Validate and sanitize input (server-side)
  const sanitizedInviteCode = validateInviteCodeServer(inviteCode);
  const sanitizedInitial = validateInitialServer(initial);

  const userDocRef = doc(db, 'users', uid);
  const inviteDocRef = doc(db, 'inviteCodes', sanitizedInviteCode);

  return await runTransaction(db, async (transaction) => {
    // Read all docs first (transaction requirement)
    const userDoc = await transaction.get(userDocRef);
    const inviteDoc = await transaction.get(inviteDocRef);

    // Check if user already has an active couple
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData?.activeCoupleId) {
        throw new Error('You are already in a couple');
      }
    }

    // Validate invite code
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
    const coupleDoc = await transaction.get(coupleDocRef);

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
    const partnerDoc = await transaction.get(partnerDocRef);
    const partnerData = partnerDoc.data();

    const now = Timestamp.now();

    // Update couple - add second partner
    transaction.update(coupleDocRef, {
      partnerIds: arrayUnion(uid),
      status: 'active',
      lastActivityAt: now,
    });

    // Create player document for joining user
    const playerDocRef = doc(db, 'couples', inviteData.coupleId, 'players', uid);
    transaction.set(playerDocRef, {
      cupLevel: 0,
      gemCount: 0,
      joinedAt: now,
    });

    // Update user document with initial and coupleId
    transaction.update(userDocRef, {
      initial: sanitizedInitial,
      activeCoupleId: inviteData.coupleId,
    });

    // Mark invite code as used
    transaction.update(inviteDocRef, {
      status: 'used',
      usedBy: uid,
      usedAt: now,
    });

    return {
      coupleId: inviteData.coupleId,
      partnerId,
      partnerName: partnerData?.username ?? 'Partner',
    };
  });
}
