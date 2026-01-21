import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  User,
  Couple,
  Player,
  Attempt,
  Request,
  InviteCode,
  CreateCoupleRequest,
  CreateCoupleResponse,
  JoinCoupleRequest,
  JoinCoupleResponse,
  LogAttemptRequest,
  LogAttemptResponse,
  AcknowledgeAttemptRequest,
  AcknowledgeAttemptResponse,
  GemType,
  GemBreakdown,
  EMPTY_GEM_BREAKDOWN,
  GEM_VALUES,
} from "./types";

// Export diamond cron functions
export { diamondCron } from "./diamondCron";

admin.initializeApp();

const db = admin.firestore();

// Configuration
const DAILY_ATTEMPT_LIMIT = 20;
const INVITE_CODE_EXPIRATION_HOURS = 72;
const DEFAULT_POINTS_PER_ACK = 5;
const BASE_GEM_AWARD = 1;
const REQUEST_FULFILLMENT_BONUS = 2;
const ACK_GEM_AWARD = 3;
const ACK_COLLECTIVE_CUP_AWARD = 3;

// Helper: Generate 6-character invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper: Get start of today (UTC)
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * createCouple - Creates a new couple with the caller as first partner
 */
export const createCouple = onCall(
  async (request: CallableRequest<CreateCoupleRequest>): Promise<CreateCoupleResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const uid = request.auth.uid;
    const { displayName, initial } = request.data;

    // Validate input
    if (!displayName || displayName.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Display name is required");
    }
    if (!initial || initial.length !== 1) {
      throw new HttpsError("invalid-argument", "Initial must be a single character");
    }

    // Check if user already has an active couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      if (userData.activeCoupleId) {
        throw new HttpsError("already-exists", "You are already in a couple");
      }
    }

    // Generate unique invite code
    let inviteCode: string;
    let inviteCodeExists = true;
    while (inviteCodeExists) {
      inviteCode = generateInviteCode();
      const existing = await db.collection("inviteCodes").doc(inviteCode).get();
      inviteCodeExists = existing.exists;
    }

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + INVITE_CODE_EXPIRATION_HOURS * 60 * 60 * 1000)
    );

    // Create couple, player, user, and invite code in a batch
    const coupleRef = db.collection("couples").doc();
    const coupleId = coupleRef.id;

    const batch = db.batch();

    // Create couple document
    const coupleData: Couple = {
      partnerIds: [uid],
      status: "pending",
      inviteCode: inviteCode!,
      pointsPerAcknowledgment: DEFAULT_POINTS_PER_ACK,
      collectiveCupLevel: 0,
      createdAt: now,
      lastActivityAt: now,
    };
    batch.set(coupleRef, coupleData);

    // Create player document
    const playerRef = coupleRef.collection("players").doc(uid);
    const playerData: Player = {
      cupLevel: 0,
      gemCount: 0,
      joinedAt: now,
    };
    batch.set(playerRef, playerData);

    // Create/update user document
    const userRef = db.collection("users").doc(uid);
    const userData: User = {
      displayName: displayName.trim(),
      initial: initial.toUpperCase(),
      activeCoupleId: coupleId,
      createdAt: now,
    };
    batch.set(userRef, userData, { merge: true });

    // Create invite code document
    const inviteCodeRef = db.collection("inviteCodes").doc(inviteCode!);
    const inviteCodeData: InviteCode = {
      coupleId,
      creatorId: uid,
      status: "active",
      createdAt: now,
      expiresAt,
    };
    batch.set(inviteCodeRef, inviteCodeData);

    await batch.commit();

    return {
      coupleId,
      inviteCode: inviteCode!,
    };
  }
);

/**
 * joinCouple - Joins an existing couple using an invite code
 */
export const joinCouple = onCall(
  async (request: CallableRequest<JoinCoupleRequest>): Promise<JoinCoupleResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const uid = request.auth.uid;
    const { inviteCode, displayName, initial } = request.data;

    // Validate input
    if (!inviteCode || inviteCode.length !== 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format");
    }
    if (!displayName || displayName.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Display name is required");
    }
    if (!initial || initial.length !== 1) {
      throw new HttpsError("invalid-argument", "Initial must be a single character");
    }

    // Check if user already has an active couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      if (userData.activeCoupleId) {
        throw new HttpsError("already-exists", "You are already in a couple");
      }
    }

    // Validate invite code
    const inviteRef = db.collection("inviteCodes").doc(inviteCode.toUpperCase());
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      throw new HttpsError("not-found", "Invalid invite code");
    }

    const inviteData = inviteDoc.data() as InviteCode;

    if (inviteData.status !== "active") {
      throw new HttpsError("failed-precondition", "Invite code has already been used");
    }

    if (inviteData.expiresAt.toDate() < new Date()) {
      throw new HttpsError("failed-precondition", "Invite code has expired");
    }

    if (inviteData.creatorId === uid) {
      throw new HttpsError("failed-precondition", "Cannot join your own couple");
    }

    // Get couple and verify it only has one partner
    const coupleRef = db.collection("couples").doc(inviteData.coupleId);
    const coupleDoc = await coupleRef.get();

    if (!coupleDoc.exists) {
      throw new HttpsError("not-found", "Couple not found");
    }

    const coupleData = coupleDoc.data() as Couple;

    if (coupleData.partnerIds.length >= 2) {
      throw new HttpsError("failed-precondition", "Couple already has two partners");
    }

    // Get partner info for response
    const partnerId = coupleData.partnerIds[0];
    const partnerDoc = await db.collection("users").doc(partnerId).get();
    const partnerData = partnerDoc.data() as User;

    const now = Timestamp.now();

    // Join couple in a batch
    const batch = db.batch();

    // Update couple
    batch.update(coupleRef, {
      partnerIds: FieldValue.arrayUnion(uid),
      status: "active",
      lastActivityAt: now,
    });

    // Create player document for joining user
    const playerRef = coupleRef.collection("players").doc(uid);
    const playerData: Player = {
      cupLevel: 0,
      gemCount: 0,
      joinedAt: now,
    };
    batch.set(playerRef, playerData);

    // Create/update user document
    const userRef = db.collection("users").doc(uid);
    const userData: User = {
      displayName: displayName.trim(),
      initial: initial.toUpperCase(),
      activeCoupleId: inviteData.coupleId,
      createdAt: now,
    };
    batch.set(userRef, userData, { merge: true });

    // Mark invite code as used
    batch.update(inviteRef, { status: "used" });

    await batch.commit();

    return {
      coupleId: inviteData.coupleId,
      partnerId,
      partnerName: partnerData.displayName,
    };
  }
);

/**
 * logAttempt - Logs an action done for partner
 */
export const logAttempt = onCall(
  async (request: CallableRequest<LogAttemptRequest>): Promise<LogAttemptResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const uid = request.auth.uid;
    const { forPlayerId, action, description, category } = request.data;

    // Validate input
    if (!action || action.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Action is required");
    }

    // Get user's couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data() as User;
    if (!userData.activeCoupleId) {
      throw new HttpsError("failed-precondition", "You are not in a couple");
    }

    const coupleId = userData.activeCoupleId;

    // Verify couple exists and user is a partner
    const coupleRef = db.collection("couples").doc(coupleId);
    const coupleDoc = await coupleRef.get();
    if (!coupleDoc.exists) {
      throw new HttpsError("not-found", "Couple not found");
    }

    const coupleData = coupleDoc.data() as Couple;
    if (!coupleData.partnerIds.includes(uid)) {
      throw new HttpsError("permission-denied", "You are not part of this couple");
    }

    // Prevent self-attempts
    if (forPlayerId === uid) {
      throw new HttpsError("invalid-argument", "Cannot log attempt for yourself");
    }

    // Verify forPlayerId is the partner
    if (!coupleData.partnerIds.includes(forPlayerId)) {
      throw new HttpsError("invalid-argument", "Invalid partner ID");
    }

    // Check daily attempt limit
    const startOfToday = getStartOfToday();
    const todayAttempts = await coupleRef
      .collection("attempts")
      .where("byPlayerId", "==", uid)
      .where("createdAt", ">=", Timestamp.fromDate(startOfToday))
      .count()
      .get();

    if (todayAttempts.data().count >= DAILY_ATTEMPT_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily limit of ${DAILY_ATTEMPT_LIMIT} attempts reached`
      );
    }

    const now = Timestamp.now();
    const normalizedAction = action.trim().toLowerCase();

    // Check for matching active request (case-insensitive)
    let fulfilledRequestId: string | undefined;
    const matchingRequests = await coupleRef
      .collection("requests")
      .where("forPlayerId", "==", uid) // Request was made BY partner, FOR me to do
      .where("status", "==", "active")
      .get();

    for (const reqDoc of matchingRequests.docs) {
      const reqData = reqDoc.data() as Request;
      if (reqData.action.trim().toLowerCase() === normalizedAction) {
        fulfilledRequestId = reqDoc.id;
        break;
      }
    }

    // Determine gem type based on whether request is fulfilled
    const gemType: GemType = fulfilledRequestId ? "sapphire" : "emerald";
    const gemsAwarded = GEM_VALUES[gemType];

    // Get current player data for gem breakdown update
    const playerRef = coupleRef.collection("players").doc(uid);
    const playerDoc = await playerRef.get();
    const playerData = playerDoc.data() as Player | undefined;
    const currentBreakdown: GemBreakdown = playerData?.gemBreakdown || { ...EMPTY_GEM_BREAKDOWN };

    // Create attempt and update state in batch
    const batch = db.batch();

    // Create attempt with gem economy fields
    const attemptRef = coupleRef.collection("attempts").doc();
    const attemptData: Attempt = {
      byPlayerId: uid,
      forPlayerId,
      action: action.trim(),
      description: description?.trim(),
      category,
      createdAt: now,
      acknowledged: false,
      fulfilledRequestId,
      // Gem economy fields
      gemType,
      gemState: "solid",  // New attempts are solid until acknowledged
    };
    batch.set(attemptRef, attemptData);

    // Update player gems (dual-write: both gemCount and gemBreakdown)
    batch.update(playerRef, {
      gemCount: FieldValue.increment(gemsAwarded),
      gemBreakdown: {
        ...currentBreakdown,
        [gemType]: (currentBreakdown[gemType] || 0) + 1,
      },
    });

    // Update couple lastActivityAt
    batch.update(coupleRef, { lastActivityAt: now });

    // If fulfilling a request, mark it as fulfilled
    if (fulfilledRequestId) {
      const requestRef = coupleRef.collection("requests").doc(fulfilledRequestId);
      batch.update(requestRef, {
        status: "fulfilled",
        fulfilledAt: now,
        fulfilledByAttemptId: attemptRef.id,
      });
    }

    await batch.commit();

    return {
      attemptId: attemptRef.id,
      gemsAwarded,
      fulfilledRequestId,
      gemType,
    };
  }
);

/**
 * acknowledgeAttempt - Acknowledge an action done by partner
 * Awards ruby gems to both players and transforms gem state from solid->liquid
 */
export const acknowledgeAttempt = onCall(
  async (
    request: CallableRequest<AcknowledgeAttemptRequest>
  ): Promise<AcknowledgeAttemptResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const uid = request.auth.uid;
    const { attemptId } = request.data;

    if (!attemptId) {
      throw new HttpsError("invalid-argument", "Attempt ID is required");
    }

    // Get user's couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data() as User;
    if (!userData.activeCoupleId) {
      throw new HttpsError("failed-precondition", "You are not in a couple");
    }

    const coupleId = userData.activeCoupleId;
    const coupleRef = db.collection("couples").doc(coupleId);

    // Get attempt
    const attemptRef = coupleRef.collection("attempts").doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists) {
      throw new HttpsError("not-found", "Attempt not found");
    }

    const attemptData = attemptDoc.data() as Attempt;

    // Verify caller is the recipient
    if (attemptData.forPlayerId !== uid) {
      throw new HttpsError("permission-denied", "Only the recipient can acknowledge");
    }

    // Check if already acknowledged
    if (attemptData.acknowledged) {
      throw new HttpsError("already-exists", "Attempt already acknowledged");
    }

    // Check if this was a coal-state attempt (reignition)
    const wasCoal = attemptData.gemState === "coal";
    const originalGemType: GemType = attemptData.gemType || "emerald";

    // Get couple for pointsPerAcknowledgment
    const coupleDoc = await coupleRef.get();
    const coupleData = coupleDoc.data() as Couple;

    const now = Timestamp.now();

    // Get both players' data for gem breakdown updates
    const recipientPlayerRef = coupleRef.collection("players").doc(uid);
    const actorPlayerRef = coupleRef.collection("players").doc(attemptData.byPlayerId);

    const [recipientPlayerDoc, actorPlayerDoc] = await Promise.all([
      recipientPlayerRef.get(),
      actorPlayerRef.get(),
    ]);

    const recipientPlayer = recipientPlayerDoc.data() as Player;
    const actorPlayer = actorPlayerDoc.data() as Player;

    // Get current gem breakdowns
    const recipientGemBreakdown: GemBreakdown = recipientPlayer?.gemBreakdown || { ...EMPTY_GEM_BREAKDOWN };
    const recipientLiquidBreakdown: GemBreakdown = recipientPlayer?.liquidBreakdown || { ...EMPTY_GEM_BREAKDOWN };
    const actorGemBreakdown: GemBreakdown = actorPlayer?.gemBreakdown || { ...EMPTY_GEM_BREAKDOWN };
    const actorLiquidBreakdown: GemBreakdown = actorPlayer?.liquidBreakdown || { ...EMPTY_GEM_BREAKDOWN };

    // Calculate cup overflow
    const newCupLevel = recipientPlayer.cupLevel + coupleData.pointsPerAcknowledgment;
    const cupOverflow = newCupLevel >= 100;
    const finalCupLevel = cupOverflow ? newCupLevel - 100 : newCupLevel;

    // Check for diamond trigger on overflow
    let diamondAwarded = false;

    // Update everything in a batch
    const batch = db.batch();

    // Mark attempt as acknowledged with gem state transition
    batch.update(attemptRef, {
      acknowledged: true,
      acknowledgedAt: now,
      gemState: "liquid",  // solid -> liquid (or coal -> liquid for reignition)
    });

    // Award ruby gems to actor (the one who did the action)
    batch.update(actorPlayerRef, {
      gemCount: FieldValue.increment(GEM_VALUES.ruby),
      gemBreakdown: {
        ...actorGemBreakdown,
        ruby: (actorGemBreakdown.ruby || 0) + 1,
      },
      liquidBreakdown: {
        ...actorLiquidBreakdown,
        ruby: (actorLiquidBreakdown.ruby || 0) + 1,
        [originalGemType]: (actorLiquidBreakdown[originalGemType] || 0) + 1,
      },
    });

    // Award ruby gems to recipient and update cup level
    batch.update(recipientPlayerRef, {
      gemCount: FieldValue.increment(GEM_VALUES.ruby),
      cupLevel: finalCupLevel,
      gemBreakdown: {
        ...recipientGemBreakdown,
        ruby: (recipientGemBreakdown.ruby || 0) + 1,
      },
      liquidBreakdown: {
        ...recipientLiquidBreakdown,
        ruby: (recipientLiquidBreakdown.ruby || 0) + 1,
      },
    });

    // Update collective cup (with overflow handling)
    const newCollectiveCupRaw = coupleData.collectiveCupLevel + ACK_COLLECTIVE_CUP_AWARD;
    const collectiveCupOverflow = newCollectiveCupRaw >= 100;
    const finalCollectiveCup = collectiveCupOverflow ? newCollectiveCupRaw - 100 : newCollectiveCupRaw;

    // If overflow, award diamond
    if (cupOverflow || collectiveCupOverflow) {
      diamondAwarded = true;
      // Award diamond to both players on any overflow
      batch.update(actorPlayerRef, {
        gemCount: FieldValue.increment(GEM_VALUES.diamond),
        "gemBreakdown.diamond": FieldValue.increment(1),
        "liquidBreakdown.diamond": FieldValue.increment(1),
      });
      batch.update(recipientPlayerRef, {
        gemCount: FieldValue.increment(GEM_VALUES.diamond),
        "gemBreakdown.diamond": FieldValue.increment(1),
        "liquidBreakdown.diamond": FieldValue.increment(1),
      });
    }

    batch.update(coupleRef, {
      collectiveCupLevel: finalCollectiveCup,
      lastActivityAt: now,
    });

    await batch.commit();

    return {
      success: true,
      gemsAwarded: GEM_VALUES.ruby * 2, // Ruby to both players
      cupOverflow,
      collectiveCupOverflow,
      wasCoal,
      diamondAwarded,
    };
  }
);
