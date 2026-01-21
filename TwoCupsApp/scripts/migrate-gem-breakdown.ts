/**
 * Migration Script: Gem Economy Backfill
 *
 * This script migrates existing data to the new gem economy system.
 * It infers gem types from existing attempt data and populates
 * gemBreakdown and liquidBreakdown fields for all players.
 *
 * Usage:
 *   npx ts-node scripts/migrate-gem-breakdown.ts
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials configured
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize Firebase Admin with flexible credential loading
 */
function initializeFirebase() {
  // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS if set
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using credentials from GOOGLE_APPLICATION_CREDENTIALS');
    admin.initializeApp();
    return;
  }

  // Option 2: Look for serviceAccountKey.json in common locations
  const commonPaths = [
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(process.cwd(), 'TwoCupsApp', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'TwoCupsApp', 'serviceAccountKey.json'),
  ];

  for (const certPath of commonPaths) {
    if (fs.existsSync(certPath)) {
      console.log(`Using credentials from: ${certPath}`);
      admin.initializeApp({
        credential: admin.credential.cert(certPath),
      });
      return;
    }
  }

  console.error('\nERROR: Firebase Admin credentials not found!');
  console.log('Please either:');
  console.log('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('2. Place serviceAccountKey.json in the current directory or TwoCupsApp/ directory\n');
  process.exit(1);
}

// Initialize Firebase Admin
initializeFirebase();
const db = admin.firestore();

// Gem economy constants (must match app constants)
const GEM_VALUES = {
  emerald: 1,
  sapphire: 2,
  ruby: 3,
  diamond: 5,
} as const;

const COAL_THRESHOLD_DAYS = 14;

type GemType = 'emerald' | 'sapphire' | 'ruby' | 'diamond';
type GemState = 'solid' | 'liquid' | 'coal';

interface GemBreakdown {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
}

const EMPTY_GEM_BREAKDOWN: GemBreakdown = {
  emerald: 0,
  sapphire: 0,
  ruby: 0,
  diamond: 0,
};

interface MigrationStats {
  couplesProcessed: number;
  attemptsProcessed: number;
  attemptsUpdated: number;
  playersUpdated: number;
  errors: string[];
}

/**
 * Main migration function
 */
async function migrateGemBreakdown(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    couplesProcessed: 0,
    attemptsProcessed: 0,
    attemptsUpdated: 0,
    playersUpdated: 0,
    errors: [],
  };

  console.log('Starting gem economy migration...\n');

  try {
    // Get all couples
    const couplesSnapshot = await db.collection('couples').get();
    console.log(`Found ${couplesSnapshot.size} couples to process\n`);

    for (const coupleDoc of couplesSnapshot.docs) {
      const coupleId = coupleDoc.id;
      const coupleData = coupleDoc.data();

      console.log(`\nProcessing couple: ${coupleId}`);

      try {
        await processCoupleData(coupleId, coupleData, stats);
        stats.couplesProcessed++;
      } catch (error) {
        const errorMsg = `Error processing couple ${coupleId}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    console.error('Fatal error during migration:', error);
    stats.errors.push(`Fatal error: ${error}`);
  }

  return stats;
}

/**
 * Process a single couple's data
 */
async function processCoupleData(
  coupleId: string,
  coupleData: admin.firestore.DocumentData,
  stats: MigrationStats
): Promise<void> {
  const partnerIds = coupleData.partnerIds || [];

  // Initialize gem breakdowns for each player
  const playerBreakdowns: Record<string, { gemBreakdown: GemBreakdown; liquidBreakdown: GemBreakdown }> = {};
  for (const playerId of partnerIds) {
    playerBreakdowns[playerId] = {
      gemBreakdown: { ...EMPTY_GEM_BREAKDOWN },
      liquidBreakdown: { ...EMPTY_GEM_BREAKDOWN },
    };
  }

  // Get coal threshold date
  const coalThresholdDate = new Date();
  coalThresholdDate.setDate(coalThresholdDate.getDate() - COAL_THRESHOLD_DAYS);

  // Process all attempts for this couple
  const attemptsSnapshot = await db
    .collection('couples')
    .doc(coupleId)
    .collection('attempts')
    .get();

  console.log(`  Found ${attemptsSnapshot.size} attempts`);

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 450; // Firestore limit is 500, leave some buffer

  for (const attemptDoc of attemptsSnapshot.docs) {
    const attemptData = attemptDoc.data();
    stats.attemptsProcessed++;

    // Determine gem type
    const gemType: GemType = attemptData.fulfilledRequestId ? 'sapphire' : 'emerald';

    // Determine gem state
    let gemState: GemState;
    if (attemptData.acknowledged) {
      gemState = 'liquid';
    } else {
      const createdAt = attemptData.createdAt?.toDate();
      if (createdAt && createdAt < coalThresholdDate) {
        gemState = 'coal';
      } else {
        gemState = 'solid';
      }
    }

    // Update attempt document if needed
    if (!attemptData.gemType || !attemptData.gemState) {
      const updateData: Record<string, unknown> = {};

      if (!attemptData.gemType) {
        updateData.gemType = gemType;
      }

      if (!attemptData.gemState) {
        updateData.gemState = gemState;
        if (gemState === 'coal') {
          updateData.coalAt = admin.firestore.Timestamp.now();
        }
      }

      batch.update(attemptDoc.ref, updateData);
      batchCount++;
      stats.attemptsUpdated++;
    }

    // Accumulate gem counts for players
    const byPlayerId = attemptData.byPlayerId;
    const forPlayerId = attemptData.forPlayerId;

    if (byPlayerId && playerBreakdowns[byPlayerId]) {
      // Actor earns the gem type (emerald or sapphire)
      playerBreakdowns[byPlayerId].gemBreakdown[gemType]++;

      if (gemState === 'liquid') {
        // If acknowledged, add to liquid breakdown
        playerBreakdowns[byPlayerId].liquidBreakdown[gemType]++;

        // Both players earn ruby for acknowledgment
        playerBreakdowns[byPlayerId].gemBreakdown.ruby++;
        playerBreakdowns[byPlayerId].liquidBreakdown.ruby++;
      }
    }

    if (forPlayerId && playerBreakdowns[forPlayerId] && attemptData.acknowledged) {
      // Recipient also earns ruby for acknowledging
      playerBreakdowns[forPlayerId].gemBreakdown.ruby++;
      playerBreakdowns[forPlayerId].liquidBreakdown.ruby++;
    }

    // Commit batch if approaching limit
    if (batchCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} updates`);
      batchCount = 0;
    }
  }

  // Update player documents with accumulated breakdowns
  for (const playerId of partnerIds) {
    const playerRef = db
      .collection('couples')
      .doc(coupleId)
      .collection('players')
      .doc(playerId);

    const playerDoc = await playerRef.get();
    if (playerDoc.exists) {
      const existingData = playerDoc.data();

      // Only update if not already migrated
      if (!existingData?.gemBreakdown) {
        batch.update(playerRef, {
          gemBreakdown: playerBreakdowns[playerId].gemBreakdown,
          liquidBreakdown: playerBreakdowns[playerId].liquidBreakdown,
        });
        batchCount++;
        stats.playersUpdated++;
      }
    }
  }

  // Commit any remaining updates
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} updates`);
  }

  console.log(`  Attempts updated: ${stats.attemptsUpdated}`);
  console.log(`  Players updated: ${stats.playersUpdated}`);
}

/**
 * Verify migration results
 */
async function verifyMigration(): Promise<void> {
  console.log('\n\n=== VERIFICATION ===\n');

  const couplesSnapshot = await db.collection('couples').limit(5).get();

  for (const coupleDoc of couplesSnapshot.docs) {
    const coupleId = coupleDoc.id;
    console.log(`\nCouple: ${coupleId}`);

    // Check attempts
    const attemptsSnapshot = await db
      .collection('couples')
      .doc(coupleId)
      .collection('attempts')
      .limit(3)
      .get();

    for (const attemptDoc of attemptsSnapshot.docs) {
      const data = attemptDoc.data();
      console.log(`  Attempt ${attemptDoc.id}: gemType=${data.gemType}, gemState=${data.gemState}`);
    }

    // Check players
    const playersSnapshot = await db
      .collection('couples')
      .doc(coupleId)
      .collection('players')
      .get();

    for (const playerDoc of playersSnapshot.docs) {
      const data = playerDoc.data();
      console.log(`  Player ${playerDoc.id}:`);
      console.log(`    gemBreakdown: ${JSON.stringify(data.gemBreakdown)}`);
      console.log(`    liquidBreakdown: ${JSON.stringify(data.liquidBreakdown)}`);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('GEM ECONOMY MIGRATION');
  console.log('='.repeat(60));
  console.log('\nThis script will:');
  console.log('1. Add gemType and gemState to all attempts');
  console.log('2. Calculate gemBreakdown and liquidBreakdown for all players');
  console.log('3. Mark old unacknowledged attempts as coal\n');

  // Run migration
  const stats = await migrateGemBreakdown();

  // Print summary
  console.log('\n\n=== MIGRATION SUMMARY ===');
  console.log(`Couples processed: ${stats.couplesProcessed}`);
  console.log(`Attempts processed: ${stats.attemptsProcessed}`);
  console.log(`Attempts updated: ${stats.attemptsUpdated}`);
  console.log(`Players updated: ${stats.playersUpdated}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  } else {
    console.log('\nNo errors encountered!');
  }

  // Verify
  await verifyMigration();

  console.log('\n\nMigration complete!');
}

// Run the migration
main().catch(console.error);
