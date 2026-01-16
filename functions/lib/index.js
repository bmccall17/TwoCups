"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeAttempt = exports.logAttempt = exports.joinCouple = exports.createCouple = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
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
function generateInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 for clarity
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// Helper: Get start of today (UTC)
function getStartOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
/**
 * createCouple - Creates a new couple with the caller as first partner
 */
exports.createCouple = (0, https_1.onCall)(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    }
    const uid = request.auth.uid;
    const { displayName, initial } = request.data;
    // Validate input
    if (!displayName || displayName.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Display name is required");
    }
    if (!initial || initial.length !== 1) {
        throw new https_1.HttpsError("invalid-argument", "Initial must be a single character");
    }
    // Check if user already has an active couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.activeCoupleId) {
            throw new https_1.HttpsError("already-exists", "You are already in a couple");
        }
    }
    // Generate unique invite code
    let inviteCode;
    let inviteCodeExists = true;
    while (inviteCodeExists) {
        inviteCode = generateInviteCode();
        const existing = await db.collection("inviteCodes").doc(inviteCode).get();
        inviteCodeExists = existing.exists;
    }
    const now = firestore_1.Timestamp.now();
    const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + INVITE_CODE_EXPIRATION_HOURS * 60 * 60 * 1000));
    // Create couple, player, user, and invite code in a batch
    const coupleRef = db.collection("couples").doc();
    const coupleId = coupleRef.id;
    const batch = db.batch();
    // Create couple document
    const coupleData = {
        partnerIds: [uid],
        status: "pending",
        inviteCode: inviteCode,
        pointsPerAcknowledgment: DEFAULT_POINTS_PER_ACK,
        collectiveCupLevel: 0,
        createdAt: now,
        lastActivityAt: now,
    };
    batch.set(coupleRef, coupleData);
    // Create player document
    const playerRef = coupleRef.collection("players").doc(uid);
    const playerData = {
        cupLevel: 0,
        gemCount: 0,
        joinedAt: now,
    };
    batch.set(playerRef, playerData);
    // Create/update user document
    const userRef = db.collection("users").doc(uid);
    const userData = {
        displayName: displayName.trim(),
        initial: initial.toUpperCase(),
        activeCoupleId: coupleId,
        createdAt: now,
    };
    batch.set(userRef, userData, { merge: true });
    // Create invite code document
    const inviteCodeRef = db.collection("inviteCodes").doc(inviteCode);
    const inviteCodeData = {
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
        inviteCode: inviteCode,
    };
});
/**
 * joinCouple - Joins an existing couple using an invite code
 */
exports.joinCouple = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    }
    const uid = request.auth.uid;
    const { inviteCode, displayName, initial } = request.data;
    // Validate input
    if (!inviteCode || inviteCode.length !== 6) {
        throw new https_1.HttpsError("invalid-argument", "Invalid invite code format");
    }
    if (!displayName || displayName.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Display name is required");
    }
    if (!initial || initial.length !== 1) {
        throw new https_1.HttpsError("invalid-argument", "Initial must be a single character");
    }
    // Check if user already has an active couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.activeCoupleId) {
            throw new https_1.HttpsError("already-exists", "You are already in a couple");
        }
    }
    // Validate invite code
    const inviteRef = db.collection("inviteCodes").doc(inviteCode.toUpperCase());
    const inviteDoc = await inviteRef.get();
    if (!inviteDoc.exists) {
        throw new https_1.HttpsError("not-found", "Invalid invite code");
    }
    const inviteData = inviteDoc.data();
    if (inviteData.status !== "active") {
        throw new https_1.HttpsError("failed-precondition", "Invite code has already been used");
    }
    if (inviteData.expiresAt.toDate() < new Date()) {
        throw new https_1.HttpsError("failed-precondition", "Invite code has expired");
    }
    if (inviteData.creatorId === uid) {
        throw new https_1.HttpsError("failed-precondition", "Cannot join your own couple");
    }
    // Get couple and verify it only has one partner
    const coupleRef = db.collection("couples").doc(inviteData.coupleId);
    const coupleDoc = await coupleRef.get();
    if (!coupleDoc.exists) {
        throw new https_1.HttpsError("not-found", "Couple not found");
    }
    const coupleData = coupleDoc.data();
    if (coupleData.partnerIds.length >= 2) {
        throw new https_1.HttpsError("failed-precondition", "Couple already has two partners");
    }
    // Get partner info for response
    const partnerId = coupleData.partnerIds[0];
    const partnerDoc = await db.collection("users").doc(partnerId).get();
    const partnerData = partnerDoc.data();
    const now = firestore_1.Timestamp.now();
    // Join couple in a batch
    const batch = db.batch();
    // Update couple
    batch.update(coupleRef, {
        partnerIds: firestore_1.FieldValue.arrayUnion(uid),
        status: "active",
        lastActivityAt: now,
    });
    // Create player document for joining user
    const playerRef = coupleRef.collection("players").doc(uid);
    const playerData = {
        cupLevel: 0,
        gemCount: 0,
        joinedAt: now,
    };
    batch.set(playerRef, playerData);
    // Create/update user document
    const userRef = db.collection("users").doc(uid);
    const userData = {
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
});
/**
 * logAttempt - Logs an action done for partner
 */
exports.logAttempt = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    }
    const uid = request.auth.uid;
    const { forPlayerId, action, description, category } = request.data;
    // Validate input
    if (!action || action.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Action is required");
    }
    // Get user's couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    if (!userData.activeCoupleId) {
        throw new https_1.HttpsError("failed-precondition", "You are not in a couple");
    }
    const coupleId = userData.activeCoupleId;
    // Verify couple exists and user is a partner
    const coupleRef = db.collection("couples").doc(coupleId);
    const coupleDoc = await coupleRef.get();
    if (!coupleDoc.exists) {
        throw new https_1.HttpsError("not-found", "Couple not found");
    }
    const coupleData = coupleDoc.data();
    if (!coupleData.partnerIds.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "You are not part of this couple");
    }
    // Prevent self-attempts
    if (forPlayerId === uid) {
        throw new https_1.HttpsError("invalid-argument", "Cannot log attempt for yourself");
    }
    // Verify forPlayerId is the partner
    if (!coupleData.partnerIds.includes(forPlayerId)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid partner ID");
    }
    // Check daily attempt limit
    const startOfToday = getStartOfToday();
    const todayAttempts = await coupleRef
        .collection("attempts")
        .where("byPlayerId", "==", uid)
        .where("createdAt", ">=", firestore_1.Timestamp.fromDate(startOfToday))
        .count()
        .get();
    if (todayAttempts.data().count >= DAILY_ATTEMPT_LIMIT) {
        throw new https_1.HttpsError("resource-exhausted", `Daily limit of ${DAILY_ATTEMPT_LIMIT} attempts reached`);
    }
    const now = firestore_1.Timestamp.now();
    const normalizedAction = action.trim().toLowerCase();
    // Check for matching active request (case-insensitive)
    let fulfilledRequestId;
    const matchingRequests = await coupleRef
        .collection("requests")
        .where("forPlayerId", "==", uid) // Request was made BY partner, FOR me to do
        .where("status", "==", "active")
        .get();
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
    // Create attempt and update state in batch
    const batch = db.batch();
    // Create attempt
    const attemptRef = coupleRef.collection("attempts").doc();
    const attemptData = {
        byPlayerId: uid,
        forPlayerId,
        action: action.trim(),
        description: description?.trim(),
        category,
        createdAt: now,
        acknowledged: false,
        fulfilledRequestId,
    };
    batch.set(attemptRef, attemptData);
    // Update player gems
    const playerRef = coupleRef.collection("players").doc(uid);
    batch.update(playerRef, {
        gemCount: firestore_1.FieldValue.increment(gemsAwarded),
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
    };
});
/**
 * acknowledgeAttempt - Acknowledge an action done by partner
 */
exports.acknowledgeAttempt = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    }
    const uid = request.auth.uid;
    const { attemptId } = request.data;
    if (!attemptId) {
        throw new https_1.HttpsError("invalid-argument", "Attempt ID is required");
    }
    // Get user's couple
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    if (!userData.activeCoupleId) {
        throw new https_1.HttpsError("failed-precondition", "You are not in a couple");
    }
    const coupleId = userData.activeCoupleId;
    const coupleRef = db.collection("couples").doc(coupleId);
    // Get attempt
    const attemptRef = coupleRef.collection("attempts").doc(attemptId);
    const attemptDoc = await attemptRef.get();
    if (!attemptDoc.exists) {
        throw new https_1.HttpsError("not-found", "Attempt not found");
    }
    const attemptData = attemptDoc.data();
    // Verify caller is the recipient
    if (attemptData.forPlayerId !== uid) {
        throw new https_1.HttpsError("permission-denied", "Only the recipient can acknowledge");
    }
    // Check if already acknowledged
    if (attemptData.acknowledged) {
        throw new https_1.HttpsError("already-exists", "Attempt already acknowledged");
    }
    // Get couple for pointsPerAcknowledgment
    const coupleDoc = await coupleRef.get();
    const coupleData = coupleDoc.data();
    const now = firestore_1.Timestamp.now();
    // Calculate cup overflow
    const recipientPlayerRef = coupleRef.collection("players").doc(uid);
    const recipientPlayerDoc = await recipientPlayerRef.get();
    const recipientPlayer = recipientPlayerDoc.data();
    const newCupLevel = recipientPlayer.cupLevel + coupleData.pointsPerAcknowledgment;
    const cupOverflow = newCupLevel >= 100;
    const finalCupLevel = cupOverflow ? newCupLevel - 100 : newCupLevel;
    // Update everything in a batch
    const batch = db.batch();
    // Mark attempt as acknowledged
    batch.update(attemptRef, {
        acknowledged: true,
        acknowledgedAt: now,
    });
    // Award gems to both players
    const actorPlayerRef = coupleRef.collection("players").doc(attemptData.byPlayerId);
    batch.update(actorPlayerRef, {
        gemCount: firestore_1.FieldValue.increment(ACK_GEM_AWARD),
    });
    batch.update(recipientPlayerRef, {
        gemCount: firestore_1.FieldValue.increment(ACK_GEM_AWARD),
        cupLevel: finalCupLevel,
    });
    // Update collective cup (with overflow handling)
    const newCollectiveCupRaw = coupleData.collectiveCupLevel + ACK_COLLECTIVE_CUP_AWARD;
    const collectiveCupOverflow = newCollectiveCupRaw >= 100;
    const finalCollectiveCup = collectiveCupOverflow ? newCollectiveCupRaw - 100 : newCollectiveCupRaw;
    batch.update(coupleRef, {
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
});
//# sourceMappingURL=index.js.map