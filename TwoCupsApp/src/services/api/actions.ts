import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  query,
  where,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase/config';
import {
  validateActionServer,
  validateDescriptionServer,
} from '../../utils/validation';

// Game configuration
const BASE_GEM_AWARD = 1;
const REQUEST_FULFILLMENT_BONUS = 2;
const ACK_GEM_AWARD = 3;
const ACK_COLLECTIVE_CUP_AWARD = 3;
const DEFAULT_POINTS_PER_ACK = 5;
const DAILY_ATTEMPT_LIMIT = 20;
const ACTIVE_REQUEST_LIMIT = 5;

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

export interface DailyAttemptsInfo {
  count: number;
  remaining: number;
  limit: number;
}

export interface DailyGemEarnings {
  total: number;
  fromLogging: number;
  fromAcknowledgments: number;
}

export interface ActiveRequestsInfo {
  count: number;
  remaining: number;
  limit: number;
}

export interface AcknowledgeAttemptParams {
  coupleId: string;
  attemptId: string;
}

export interface AcknowledgeAttemptResult {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
  collectiveCupOverflow: boolean;
}

/**
 * Get today's attempts count for the current user
 */
export async function getDailyAttemptsInfo(coupleId: string): Promise<DailyAttemptsInfo> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTimestamp = Timestamp.fromDate(startOfDay);

  const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
  const q = query(
    attemptsRef,
    where('byPlayerId', '==', uid),
    where('createdAt', '>=', startOfDayTimestamp)
  );

  const snapshot = await getDocs(q);
  const count = snapshot.size;

  return {
    count,
    remaining: Math.max(0, DAILY_ATTEMPT_LIMIT - count),
    limit: DAILY_ATTEMPT_LIMIT,
  };
}

/**
 * Get today's gem earnings for the current user
 * Optimized: 2 queries instead of 3 (combines acknowledgment queries)
 */
export async function getDailyGemEarnings(coupleId: string): Promise<DailyGemEarnings> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTimestamp = Timestamp.fromDate(startOfDay);

  const attemptsRef = collection(db, 'couples', coupleId, 'attempts');

  // Query 1: Get attempts logged by user today (for logging gems)
  const createdTodayQuery = query(
    attemptsRef,
    where('byPlayerId', '==', uid),
    where('createdAt', '>=', startOfDayTimestamp)
  );

  // Query 2: Get ALL attempts acknowledged today (filter in-memory for byPlayerId/forPlayerId)
  const ackedTodayQuery = query(
    attemptsRef,
    where('acknowledgedAt', '>=', startOfDayTimestamp)
  );

  // Run both queries in parallel
  const [createdSnapshot, ackedSnapshot] = await Promise.all([
    getDocs(createdTodayQuery),
    getDocs(ackedTodayQuery),
  ]);

  // Calculate logging gems: base 1 + 2 bonus if fulfilled request
  let fromLogging = 0;
  createdSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    fromLogging += BASE_GEM_AWARD;
    if (data.fulfilledRequestId) {
      fromLogging += REQUEST_FULFILLMENT_BONUS;
    }
  });

  // Filter acknowledged attempts in-memory
  let fromAcknowledgmentsReceived = 0;
  let fromAcknowledgmentsGiven = 0;

  ackedSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    // Acknowledgment gems received (attempts done FOR me)
    if (data.forPlayerId === uid) {
      fromAcknowledgmentsReceived += ACK_GEM_AWARD;
    }
    // Acknowledgment gems given (attempts done BY me)
    if (data.byPlayerId === uid) {
      fromAcknowledgmentsGiven += ACK_GEM_AWARD;
    }
  });

  const fromAcknowledgments = fromAcknowledgmentsReceived + fromAcknowledgmentsGiven;

  return {
    total: fromLogging + fromAcknowledgments,
    fromLogging,
    fromAcknowledgments,
  };
}

/**
 * Get active requests count for the current user (requests they created that are still active)
 */
export async function getActiveRequestsInfo(coupleId: string): Promise<ActiveRequestsInfo> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const requestsRef = collection(db, 'couples', coupleId, 'requests');
  const q = query(
    requestsRef,
    where('byPlayerId', '==', uid),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  const count = snapshot.size;

  return {
    count,
    remaining: Math.max(0, ACTIVE_REQUEST_LIMIT - count),
    limit: ACTIVE_REQUEST_LIMIT,
  };
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

  // Validate and sanitize input (server-side)
  const sanitizedAction = validateActionServer(action);
  const sanitizedDescription = validateDescriptionServer(description);

  // Prevent self-attempts
  if (forPlayerId === uid) {
    throw new Error('Cannot log attempt for yourself');
  }

  // Check daily limit
  const dailyInfo = await getDailyAttemptsInfo(coupleId);
  if (dailyInfo.remaining <= 0) {
    throw new Error(`Daily limit reached (${DAILY_ATTEMPT_LIMIT} attempts per day). Try again tomorrow!`);
  }

  const coupleDocRef = doc(db, 'couples', coupleId);

  // Check for matching active request (case-insensitive)
  const normalizedAction = sanitizedAction.toLowerCase();
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
    action: sanitizedAction,
    description: sanitizedDescription || null,
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

  // Update collective cup (with overflow handling like individual cups)
  const currentCollectiveCup = coupleData?.collectiveCupLevel ?? 0;
  const newCollectiveCupRaw = currentCollectiveCup + ACK_COLLECTIVE_CUP_AWARD;
  const collectiveCupOverflow = newCollectiveCupRaw >= 100;
  const finalCollectiveCup = collectiveCupOverflow ? newCollectiveCupRaw - 100 : newCollectiveCupRaw;
  batch.update(coupleDocRef, {
    collectiveCupLevel: finalCollectiveCup,
    lastActivityAt: now,
  });

  await batch.commit();

  return {
    success: true,
    gemsAwarded: ACK_GEM_AWARD * 2, // Total for both players
    cupOverflow,
    collectiveCupOverflow,
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

  // Validate and sanitize input (server-side)
  const sanitizedAction = validateActionServer(action);
  const sanitizedDescription = validateDescriptionServer(description);

  // Check active request limit
  const activeInfo = await getActiveRequestsInfo(coupleId);
  if (activeInfo.remaining <= 0) {
    throw new Error(`Request limit reached (${ACTIVE_REQUEST_LIMIT} active requests). Complete or delete some requests first.`);
  }

  const now = Timestamp.now();
  const requestDocRef = doc(collection(db, 'couples', coupleId, 'requests'));

  await setDoc(requestDocRef, {
    byPlayerId: uid,
    forPlayerId,
    action: sanitizedAction,
    description: sanitizedDescription || null,
    category: category || null,
    status: 'active',
    createdAt: now,
  });

  return { requestId: requestDocRef.id };
}

/**
 * Create a suggestion (a way partner can fill your cup)
 */
export async function createSuggestion(params: {
  coupleId: string;
  action: string;
  description?: string;
  category?: string;
}): Promise<{ suggestionId: string }> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, action, description, category } = params;

  // Validate and sanitize input (server-side)
  const sanitizedAction = validateActionServer(action);
  const sanitizedDescription = validateDescriptionServer(description);

  const now = Timestamp.now();
  const suggestionDocRef = doc(collection(db, 'couples', coupleId, 'suggestions'));

  await setDoc(suggestionDocRef, {
    byPlayerId: uid,
    action: sanitizedAction,
    description: sanitizedDescription || null,
    category: category || null,
    createdAt: now,
  });

  return { suggestionId: suggestionDocRef.id };
}

/**
 * Cancel an active request (marks as canceled, doesn't delete)
 */
export async function deleteRequest(params: {
  coupleId: string;
  requestId: string;
}): Promise<{ success: boolean }> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, requestId } = params;

  if (!requestId) {
    throw new Error('Request ID is required');
  }

  const requestDocRef = doc(db, 'couples', coupleId, 'requests', requestId);
  const requestDoc = await getDoc(requestDocRef);

  if (!requestDoc.exists()) {
    throw new Error('Request not found');
  }

  const requestData = requestDoc.data();
  if (requestData.byPlayerId !== uid) {
    throw new Error('Only the creator can cancel this request');
  }

  if (requestData.status !== 'active') {
    throw new Error('Only active requests can be canceled');
  }

  // Update status to 'canceled' instead of deleting (per Firestore rules)
  await updateDoc(requestDocRef, {
    status: 'canceled',
  });

  return { success: true };
}

export interface WeeklyGemStats {
  myWeeklyGems: number;
  partnerWeeklyGems: number;
}

/**
 * Get weekly gem earnings for both players in a couple
 * Optimized: 2 queries instead of 6 (single query per date filter, filter in-memory)
 */
export async function getWeeklyGemStats(
  coupleId: string,
  myPlayerId: string,
  partnerPlayerId: string
): Promise<WeeklyGemStats> {
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekTimestamp = Timestamp.fromDate(startOfWeek);

  const attemptsRef = collection(db, 'couples', coupleId, 'attempts');

  // Query 1: All attempts created this week
  const createdThisWeekQuery = query(
    attemptsRef,
    where('createdAt', '>=', startOfWeekTimestamp)
  );

  // Query 2: All attempts acknowledged this week
  const ackedThisWeekQuery = query(
    attemptsRef,
    where('acknowledgedAt', '>=', startOfWeekTimestamp)
  );

  // Run both queries in parallel
  const [createdSnapshot, ackedSnapshot] = await Promise.all([
    getDocs(createdThisWeekQuery),
    getDocs(ackedThisWeekQuery),
  ]);

  // Calculate gems for each player in-memory
  const calculateGemsForPlayer = (playerId: string): number => {
    let totalGems = 0;

    // Logging gems from attempts created this week
    createdSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.byPlayerId === playerId) {
        totalGems += BASE_GEM_AWARD;
        if (data.fulfilledRequestId) {
          totalGems += REQUEST_FULFILLMENT_BONUS;
        }
      }
    });

    // Acknowledgment gems from attempts acknowledged this week
    ackedSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Gems received (attempts done FOR this player)
      if (data.forPlayerId === playerId) {
        totalGems += ACK_GEM_AWARD;
      }
      // Gems given (attempts done BY this player)
      if (data.byPlayerId === playerId) {
        totalGems += ACK_GEM_AWARD;
      }
    });

    return totalGems;
  };

  return {
    myWeeklyGems: calculateGemsForPlayer(myPlayerId),
    partnerWeeklyGems: calculateGemsForPlayer(partnerPlayerId),
  };
}

/**
 * Delete a suggestion
 */
export async function deleteSuggestion(params: {
  coupleId: string;
  suggestionId: string;
}): Promise<{ success: boolean }> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('Must be logged in');
  }

  const { coupleId, suggestionId } = params;

  if (!suggestionId) {
    throw new Error('Suggestion ID is required');
  }

  const suggestionDocRef = doc(db, 'couples', coupleId, 'suggestions', suggestionId);
  const suggestionDoc = await getDoc(suggestionDocRef);

  if (!suggestionDoc.exists()) {
    throw new Error('Suggestion not found');
  }

  const suggestionData = suggestionDoc.data();
  if (suggestionData.byPlayerId !== uid) {
    throw new Error('Only the creator can delete this suggestion');
  }

  await deleteDoc(suggestionDocRef);

  return { success: true };
}
