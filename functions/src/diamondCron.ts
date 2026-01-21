/**
 * Diamond Cron Cloud Function
 *
 * Runs daily to:
 * 1. Process coal transitions for unacknowledged attempts
 * 2. Check for weekly reflection diamonds (both players logged this week)
 * 3. Check for anniversary diamonds
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { Couple, GemBreakdown, EMPTY_GEM_BREAKDOWN, GEM_VALUES, COAL_THRESHOLD_DAYS } from "./types";

const db = admin.firestore();

interface DiamondCronResult {
  couplesProcessed: number;
  coalTransitions: number;
  weeklyDiamonds: number;
  anniversaryDiamonds: number;
  errors: string[];
}

/**
 * Process coal transitions for a couple
 * Transitions solid gems to coal after COAL_THRESHOLD_DAYS
 */
async function processCoalTransitions(coupleId: string): Promise<number> {
  const coalThresholdDate = new Date();
  coalThresholdDate.setDate(coalThresholdDate.getDate() - COAL_THRESHOLD_DAYS);
  const coalThresholdTimestamp = Timestamp.fromDate(coalThresholdDate);

  const attemptsRef = db.collection("couples").doc(coupleId).collection("attempts");

  // Query unacknowledged attempts older than threshold
  const snapshot = await attemptsRef
    .where("acknowledged", "==", false)
    .where("createdAt", "<", coalThresholdTimestamp)
    .get();

  let transitioned = 0;
  const now = Timestamp.now();
  const batch = db.batch();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    // Only transition if currently solid (not already coal)
    if (data.gemState !== "coal") {
      batch.update(docSnap.ref, {
        gemState: "coal",
        coalAt: now,
      });
      transitioned++;
    }
  }

  if (transitioned > 0) {
    await batch.commit();
  }

  return transitioned;
}

/**
 * Check if both partners logged attempts this week
 */
async function checkWeeklyReflection(coupleId: string, partnerIds: string[]): Promise<boolean> {
  if (partnerIds.length < 2) return false;

  // Get start of week (Monday)
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekTimestamp = Timestamp.fromDate(startOfWeek);

  const attemptsRef = db.collection("couples").doc(coupleId).collection("attempts");
  const snapshot = await attemptsRef
    .where("createdAt", ">=", startOfWeekTimestamp)
    .get();

  // Get unique loggers
  const loggers = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    loggers.add(data.byPlayerId);
  });

  // Weekly reflection = both partners logged something this week
  return partnerIds.every((id) => loggers.has(id));
}

/**
 * Check if today is the couple's anniversary
 */
function isAnniversary(coupleData: Couple): boolean {
  if (!coupleData.anniversaryDate) return false;

  const anniversary = coupleData.anniversaryDate.toDate();
  const today = new Date();

  return (
    anniversary.getMonth() === today.getMonth() &&
    anniversary.getDate() === today.getDate()
  );
}

/**
 * Award diamond to a player
 */
async function awardDiamond(
  coupleId: string,
  playerId: string,
  reason: string
): Promise<void> {
  const playerRef = db
    .collection("couples")
    .doc(coupleId)
    .collection("players")
    .doc(playerId);

  const playerDoc = await playerRef.get();
  const playerData = playerDoc.data();

  const currentBreakdown: GemBreakdown = playerData?.gemBreakdown || { ...EMPTY_GEM_BREAKDOWN };
  const currentLiquid: GemBreakdown = playerData?.liquidBreakdown || { ...EMPTY_GEM_BREAKDOWN };

  await playerRef.update({
    gemCount: FieldValue.increment(GEM_VALUES.diamond),
    gemBreakdown: {
      ...currentBreakdown,
      diamond: (currentBreakdown.diamond || 0) + 1,
    },
    liquidBreakdown: {
      ...currentLiquid,
      diamond: (currentLiquid.diamond || 0) + 1,
    },
  });

  console.log(`Awarded diamond to player ${playerId} for: ${reason}`);
}

/**
 * Process a single couple for diamond triggers
 */
async function processCoupleForDiamonds(
  coupleId: string,
  coupleData: Couple,
  isSunday: boolean
): Promise<{ weeklyDiamond: boolean; anniversaryDiamond: boolean }> {
  const partnerIds = coupleData.partnerIds || [];
  let weeklyDiamond = false;
  let anniversaryDiamond = false;

  // Check weekly reflection on Sundays
  if (isSunday && partnerIds.length >= 2) {
    const hasWeeklyReflection = await checkWeeklyReflection(coupleId, partnerIds);
    if (hasWeeklyReflection) {
      // Award diamond to both players
      for (const playerId of partnerIds) {
        await awardDiamond(coupleId, playerId, "weekly_reflection");
      }
      weeklyDiamond = true;
    }
  }

  // Check anniversary
  if (isAnniversary(coupleData)) {
    // Award diamond to both players
    for (const playerId of partnerIds) {
      await awardDiamond(coupleId, playerId, "anniversary");
    }
    anniversaryDiamond = true;
  }

  return { weeklyDiamond, anniversaryDiamond };
}

/**
 * Main cron function - runs daily at midnight UTC
 */
export const diamondCron = onSchedule(
  {
    schedule: "0 0 * * *", // Run at midnight UTC every day
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    console.log("Starting diamond cron job...");

    const result: DiamondCronResult = {
      couplesProcessed: 0,
      coalTransitions: 0,
      weeklyDiamonds: 0,
      anniversaryDiamonds: 0,
      errors: [],
    };

    // Check if today is Sunday (for weekly reflection)
    const today = new Date();
    const isSunday = today.getDay() === 0;

    try {
      // Get all active couples
      const couplesSnapshot = await db
        .collection("couples")
        .where("status", "==", "active")
        .get();

      console.log(`Processing ${couplesSnapshot.size} active couples`);

      for (const coupleDoc of couplesSnapshot.docs) {
        const coupleId = coupleDoc.id;
        const coupleData = coupleDoc.data() as Couple;

        try {
          // Process coal transitions
          const coalCount = await processCoalTransitions(coupleId);
          result.coalTransitions += coalCount;

          // Check for diamond triggers
          const diamonds = await processCoupleForDiamonds(
            coupleId,
            coupleData,
            isSunday
          );

          if (diamonds.weeklyDiamond) result.weeklyDiamonds++;
          if (diamonds.anniversaryDiamond) result.anniversaryDiamonds++;

          result.couplesProcessed++;
        } catch (error) {
          const errorMsg = `Error processing couple ${coupleId}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Fatal error in diamond cron: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    // Log summary
    console.log("Diamond cron completed:");
    console.log(`  Couples processed: ${result.couplesProcessed}`);
    console.log(`  Coal transitions: ${result.coalTransitions}`);
    console.log(`  Weekly diamonds awarded: ${result.weeklyDiamonds}`);
    console.log(`  Anniversary diamonds awarded: ${result.anniversaryDiamonds}`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
  }
);

/**
 * Manual trigger for testing - can be called via HTTP
 */
export const triggerDiamondCron = async (): Promise<DiamondCronResult> => {
  console.log("Manual diamond cron trigger...");

  const result: DiamondCronResult = {
    couplesProcessed: 0,
    coalTransitions: 0,
    weeklyDiamonds: 0,
    anniversaryDiamonds: 0,
    errors: [],
  };

  const today = new Date();
  const isSunday = today.getDay() === 0;

  try {
    const couplesSnapshot = await db
      .collection("couples")
      .where("status", "==", "active")
      .get();

    for (const coupleDoc of couplesSnapshot.docs) {
      const coupleId = coupleDoc.id;
      const coupleData = coupleDoc.data() as Couple;

      try {
        const coalCount = await processCoalTransitions(coupleId);
        result.coalTransitions += coalCount;

        const diamonds = await processCoupleForDiamonds(
          coupleId,
          coupleData,
          isSunday
        );

        if (diamonds.weeklyDiamond) result.weeklyDiamonds++;
        if (diamonds.anniversaryDiamond) result.anniversaryDiamonds++;

        result.couplesProcessed++;
      } catch (error) {
        result.errors.push(`Error processing couple ${coupleId}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
};
