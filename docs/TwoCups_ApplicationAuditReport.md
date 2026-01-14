  TwoCups Application Audit Report

  Executive Summary

  The app has solid architecture and most core screens are built, but there are critical bugs preventing key features from working. The main issue you identified is correct: suggestions cannot be created or viewed due to a Firestore rules mismatch.

  ---
  CRITICAL BUGS (Blocking Features)

  1. Suggestions Don't Work - Firestore Rules Mismatch

  Location: firestore.rules:128-129 vs actions.ts:296-297

  Problem:
  - Firestore rule expects field: createdByPlayerId
  - Client code writes field: byPlayerId

  // firestore.rules line 129
  allow create: if ... && request.resource.data.createdByPlayerId == request.auth.uid;

  // actions.ts line 296-297
  await setDoc(suggestionDocRef, {
    byPlayerId: uid,  // WRONG FIELD NAME!
    ...
  });

  Impact:
  - Creating suggestions FAILS with permission denied
  - Suggestions never save to Firestore
  - Partner can never see suggestions in LogAttemptScreen
  - ManageSuggestionsScreen always shows empty

  Fix: Change firestore.rules line 129 to use byPlayerId instead of createdByPlayerId

  ---
  2. HomeScreen Quick Actions Are Broken

  Location: App.tsx:105-106

  onNavigateToLogAttempt={() => {}}  // Empty function!
  onNavigateToAcknowledge={() => {}}  // Empty function!

  Impact: Buttons on HomeScreen don't navigate anywhere (though bottom tabs work)

  ---
  MEDIUM PRIORITY ISSUES

  3. UX: Back Buttons on Tab Screens Are Confusing

  Location: LogAttemptScreen, AcknowledgeScreen

  These screens have "← Back" buttons that were designed for stack navigation, but they're now tab screens. The back buttons call onGoBack which navigates to MainTabs - this is confusing UX for tab navigation.

  Recommendation: Remove "← Back" headers from tab-based screens, or redesign the back behavior.

  ---
  4. Daily Attempt Limit Not Enforced

  Location: actions.ts - logAttempt function

  The PRD specifies 20 attempts/day limit, but the code doesn't check this.

  Missing:
  // Check daily limit before allowing attempt
  const todayAttempts = await getDocs(query(
    collection(db, 'couples', coupleId, 'attempts'),
    where('byPlayerId', '==', uid),
    where('createdAt', '>=', startOfToday)
  ));
  if (todayAttempts.size >= 20) throw new Error('Daily limit reached');

  ---
  5. Active Request Limit Not Enforced

  Location: actions.ts - createRequest function

  PRD specifies max 5 active requests per player, but no validation.

  ---
  6. Collective Cup Doesn't Overflow/Reset

  Location: actions.ts:221-222

  const newCollectiveCup = Math.min(currentCollectiveCup + ACK_COLLECTIVE_CUP_AWARD, 100);

  Individual cups overflow and reset (line 196), but collective cup just caps at 100 without celebration/reset.

  ---
  7. No Composite Index for Suggestions Query

  Location: ManageSuggestionsScreen.tsx:50-55

  Query uses where('byPlayerId', '==', ...) + orderBy('createdAt', 'desc') which requires a composite index. This may fail without proper Firestore index configuration.

  Check: firestore.indexes.json for this index.

  ---
  EASY FIXES (Quick Wins)

  8. SettingsScreen Shows Invite Code for Active Couples

  Location: SettingsScreen.tsx:42-44

  The invite code is shown even when couple is active. Once joined, the invite code is less relevant. Consider showing partner name instead, or hiding the code.

  ---
  9. Missing Error Handling for Empty Partner ID

  Location: LogAttemptScreen.tsx:47

  const partnerId = partnerIds.find(id => id !== myUid);

  If partnerIds is empty or only contains current user, partnerId is undefined, which could cause silent failures.

  ---
  10. Acknowledge Screen Back Button Issue

  Location: AcknowledgeScreen.tsx:145-147

  Back button navigates to MainTabs, but since AcknowledgeScreen IS a tab, this is redundant.

  ---
  FEATURE GAPS vs PRD
  ┌────────────────────────────────┬────────────┬───────────────────────────┐
  │            Feature             │ PRD Status │      Current Status       │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Suggestions CRUD               │ Required   │ BROKEN (rules mismatch)   │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Suggestions visible to partner │ Required   │ BROKEN (no data)          │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Requests CRUD                  │ Required   │ Working                   │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Requests visible in LogAttempt │ Required   │ Working                   │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Request fulfillment detection  │ Required   │ Working                   │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Daily attempt limit (20)       │ Required   │ NOT IMPLEMENTED           │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Active request limit (5)       │ Required   │ NOT IMPLEMENTED           │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Cup overflow celebration       │ Required   │ Partial (individual only) │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ History/Analytics              │ Phase 3    │ Not started               │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Push Notifications             │ Phase 3    │ Not started               │
  ├────────────────────────────────┼────────────┼───────────────────────────┤
  │ Streaks/Achievements           │ Phase 4    │ Not started               │
  └────────────────────────────────┴────────────┴───────────────────────────┘
  ---
  WHAT'S WORKING

  1. Authentication - Email/password + anonymous login works
  2. Pairing - Create couple, join via invite code works
  3. Log Attempt - Can log attempts successfully
  4. Acknowledge Attempts - Can acknowledge with gem/cup awards
  5. Make Requests - Can create requests for partner
  6. Request Fulfillment - Auto-detection works
  7. Real-time sync - Firestore listeners update properly
  8. Gem economy - Basic gem awards working
  9. Cup visualization - UI components work
  10. Bottom navigation - Tab navigation works

  ---
  PRIORITY FIX ORDER

  Tonight (5 min each):

  1. Fix Firestore rules for suggestions - Change createdByPlayerId to byPlayerId in firestore.rules:129
  2. Deploy rules - firebase deploy --only firestore:rules

  Morning (Easy):

  3. Remove/fix back buttons on tab screens
  4. Fix HomeScreen empty navigation handlers
  5. Add partner name display on HomeScreen/SettingsScreen

  Morning (Medium):

  6. Add daily attempt limit check
  7. Add active request limit check
  8. Fix collective cup overflow handling

  ---
  Want me to fix the critical Firestore rules issue right now so suggestions start working?

● The audit is complete. The root cause of your suggestions issue is a simple field name mismatch between the Firestore rules and the client code - the rules expect createdByPlayerId but the code writes byPlayerId. One line fix.
