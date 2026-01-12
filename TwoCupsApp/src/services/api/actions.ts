import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';

// Game configuration
const BASE_GEM_AWARD = 1;
const REQUEST_FULFILLMENT_BONUS = 2;
const ACK_GEM_AWARD = 3;
const ACK_COLLECTIVE_CUP_AWARD = 3;
const DEFAULT_POINTS_PER_ACK = 5;

export interface LogAttemptParams {
  coupleId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
}

export interface LogAttemptResult {
  attemptId: string;
  gemsAwarded: number;
  fulfilledRequestId?: string;
}

export interface AcknowledgeAttemptParams {
  coupleId: string;
  attemptId: string;
}

export interface AcknowledgeAttemptResult {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
}

/**
 * Log an action done for partner
 */
export async function logAttempt(params: LogAttemptParams): Promise<LogAttemptResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, forPlayerId, action, description, category } = params;

  // Validate input
  if (!action || action.trim().length === 0) {
    throw new Error('Action is required');
  }

  // Prevent self-attempts
  if (forPlayerId === uid) {
    throw new Error('Cannot log attempt for yourself');
  }

  const coupleDocRef = doc(db, 'couples', coupleId);

  // Check for matching active request (case-insensitive)
  const normalizedAction = action.trim().toLowerCase();
  let fulfilledRequestId: string | undefined;

  const requestsRef = collection(db, 'couples', coupleId, 'requests');
  const requestsQuery = query(
    requestsRef,
    where('forPlayerId', '==', uid), // Request was made BY partner, FOR me to do
    where('status', '==', 'active')
  );
  const matchingRequests = await getDocs(requestsQuery);

  for (const reqDoc of matchingRequests.docs) {
    const reqData = reqDoc.data();
    if (reqData.action.trim().toLowerCase() === normalizedAction) {
      fulfilledRequestId = reqDoc.id;
      break;
    }
  }

  // Calculate gems
  let gemsAwarded = BASE_GEM_AWARD;
  if (fulfilledRequestId) {
    gemsAwarded += REQUEST_FULFILLMENT_BONUS;
  }

  const now = Timestamp.now();
  const batch = writeBatch(db);

  // Create attempt document
  const attemptDocRef = doc(collection(db, 'couples', coupleId, 'attempts'));
  batch.set(attemptDocRef, {
    byPlayerId: uid,
    forPlayerId,
    action: action.trim(),
    description: description?.trim() || null,
    category: category || null,
    createdAt: now,
    acknowledged: false,
    fulfilledRequestId: fulfilledRequestId || null,
  });

  // Update player gems
  const playerDocRef = doc(db, 'couples', coupleId, 'players', uid);
  batch.update(playerDocRef, {
    gemCount: increment(gemsAwarded),
  });

  // Update couple lastActivityAt
  batch.update(coupleDocRef, { lastActivityAt: now });

  // If fulfilling a request, mark it as fulfilled
  if (fulfilledRequestId) {
    const requestDocRef = doc(db, 'couples', coupleId, 'requests', fulfilledRequestId);
    batch.update(requestDocRef, {
      status: 'fulfilled',
      fulfilledAt: now,
      fulfilledByAttemptId: attemptDocRef.id,
    });
  }

  await batch.commit();

  return {
    attemptId: attemptDocRef.id,
    gemsAwarded,
    fulfilledRequestId,
  };
}

/**
 * Acknowledge an action done by partner
 */
export async function acknowledgeAttempt(params: AcknowledgeAttemptParams): Promise<AcknowledgeAttemptResult> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, attemptId } = params;

  if (!attemptId) {
    throw new Error('Attempt ID is required');
  }

  const coupleDocRef = doc(db, 'couples', coupleId);

  // Get attempt
  const attemptDocRef = doc(db, 'couples', coupleId, 'attempts', attemptId);
  const attemptDoc = await getDoc(attemptDocRef);

  if (!attemptDoc.exists()) {
    throw new Error('Attempt not found');
  }

  const attemptData = attemptDoc.data();
  if (!attemptData) {
    throw new Error('Attempt not found');
  }

  // Verify caller is the recipient
  if (attemptData.forPlayerId !== uid) {
    throw new Error('Only the recipient can acknowledge');
  }

  // Check if already acknowledged
  if (attemptData.acknowledged) {
    throw new Error('Attempt already acknowledged');
  }

  // Get couple for pointsPerAcknowledgment
  const coupleDoc = await getDoc(coupleDocRef);
  const coupleData = coupleDoc.data();
  const pointsPerAck = coupleData?.pointsPerAcknowledgment ?? DEFAULT_POINTS_PER_ACK;

  // Get recipient player for cup level calculation
  const recipientPlayerDocRef = doc(db, 'couples', coupleId, 'players', uid);
  const recipientPlayerDoc = await getDoc(recipientPlayerDocRef);
  const recipientPlayer = recipientPlayerDoc.data();
  const currentCupLevel = recipientPlayer?.cupLevel ?? 0;

  // Calculate cup overflow
  const newCupLevel = currentCupLevel + pointsPerAck;
  const cupOverflow = newCupLevel >= 100;
  const finalCupLevel = cupOverflow ? newCupLevel - 100 : newCupLevel;

  const now = Timestamp.now();
  const batch = writeBatch(db);

  // Mark attempt as acknowledged
  batch.update(attemptDocRef, {
    acknowledged: true,
    acknowledgedAt: now,
  });

  // Award gems to actor (the one who did the action)
  const actorPlayerDocRef = doc(db, 'couples', coupleId, 'players', attemptData.byPlayerId);
  batch.update(actorPlayerDocRef, {
    gemCount: increment(ACK_GEM_AWARD),
  });

  // Award gems to recipient and update cup level
  batch.update(recipientPlayerDocRef, {
    gemCount: increment(ACK_GEM_AWARD),
    cupLevel: finalCupLevel,
  });

  // Update collective cup
  const currentCollectiveCup = coupleData?.collectiveCupLevel ?? 0;
  const newCollectiveCup = Math.min(currentCollectiveCup + ACK_COLLECTIVE_CUP_AWARD, 100);
  batch.update(coupleDocRef, {
    collectiveCupLevel: newCollectiveCup,
    lastActivityAt: now,
  });

  await batch.commit();

  return {
    success: true,
    gemsAwarded: ACK_GEM_AWARD * 2, // Total for both players
    cupOverflow,
  };
}

/**
 * Create a request for partner to do something
 */
export async function createRequest(params: {
  coupleId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
}): Promise<{ requestId: string }> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, forPlayerId, action, description, category } = params;

  if (!action || action.trim().length === 0) {
    throw new Error('Action is required');
  }

  const now = Timestamp.now();
  const requestDocRef = doc(collection(db, 'couples', coupleId, 'requests'));

  await setDoc(requestDocRef, {
    byPlayerId: uid,
    forPlayerId,
    action: action.trim(),
    description: description?.trim() || null,
    category: category || null,
    status: 'active',
    createdAt: now,
  });

  return { requestId: requestDocRef.id };
}
