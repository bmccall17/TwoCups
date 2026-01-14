 Fix Plan: 5 Medium/Easy Issues

 Issues to Fix
 ┌─────┬─────────────────────────────────────────┬────────────────────────┬────────────┐
 │  #  │                  Issue                  │        File(s)         │ Complexity │
 ├─────┼─────────────────────────────────────────┼────────────────────────┼────────────┤
 │ 2   │ HomeScreen Quick Actions Broken         │ App.tsx                │ Easy       │
 ├─────┼─────────────────────────────────────────┼────────────────────────┼────────────┤
 │ 6   │ Collective Cup Doesn't Overflow/Reset   │ actions.ts             │ Easy       │
 ├─────┼─────────────────────────────────────────┼────────────────────────┼────────────┤
 │ 7   │ Missing Composite Index for Suggestions │ firestore.indexes.json │ Easy       │
 ├─────┼─────────────────────────────────────────┼────────────────────────┼────────────┤
 │ 8   │ SettingsScreen Shows Invite Code        │ SettingsScreen.tsx     │ Easy       │
 ├─────┼─────────────────────────────────────────┼────────────────────────┼────────────┤
 │ 10  │ Acknowledge Screen Back Button          │ AcknowledgeScreen.tsx  │ Easy       │
 └─────┴─────────────────────────────────────────┴────────────────────────┴────────────┘
 ---
 Fix #2: HomeScreen Quick Actions Broken

 File: TwoCupsApp/App.tsx

 Problem: Lines 105-106 have empty navigation handlers:
 onNavigateToLogAttempt={() => {}}
 onNavigateToAcknowledge={() => {}}

 Solution: These buttons should switch to the corresponding tabs. Use the MainTab navigation:
 onNavigateToLogAttempt={() => navigation.navigate('LogTab')}
 onNavigateToAcknowledge={() => navigation.navigate('AcknowledgeTab')}

 Note: Need to get navigation reference from the parent MainTabNavigator component's props.

 ---
 Fix #6: Collective Cup Doesn't Overflow/Reset

 File: TwoCupsApp/src/services/api/actions.ts

 Problem: Lines 220-222 cap collective cup at 100 without overflow handling:
 const currentCollectiveCup = coupleData?.collectiveCupLevel ?? 0;
 const newCollectiveCup = Math.min(currentCollectiveCup + ACK_COLLECTIVE_CUP_AWARD, 100);

 Solution: Match individual cup overflow logic (lines 194-196):
 const currentCollectiveCup = coupleData?.collectiveCupLevel ?? 0;
 const newCollectiveCupRaw = currentCollectiveCup + ACK_COLLECTIVE_CUP_AWARD;
 const collectiveCupOverflow = newCollectiveCupRaw >= 100;
 const finalCollectiveCup = collectiveCupOverflow ? newCollectiveCupRaw - 100 :
 newCollectiveCupRaw;

 Also update the return value to include collectiveCupOverflow for UI celebration.

 ---
 Fix #7: Missing Composite Index for Suggestions

 File: firestore.indexes.json

 Problem: ManageSuggestionsScreen.tsx:50-55 queries:
 const q = query(
   suggestionsRef,
   where('byPlayerId', '==', myUid),
   orderBy('createdAt', 'desc')
 );

 This requires a composite index that doesn't exist.

 Solution: Add to firestore.indexes.json:
 {
   "collectionGroup": "suggestions",
   "queryScope": "COLLECTION",
   "fields": [
     { "fieldPath": "byPlayerId", "order": "ASCENDING" },
     { "fieldPath": "createdAt", "order": "DESCENDING" }
   ]
 }

 Then deploy: firebase deploy --only firestore:indexes

 ---
 Fix #8: SettingsScreen Shows Invite Code for Active Couples

 File: TwoCupsApp/src/screens/SettingsScreen.tsx

 Problem: Lines 39-45 always show invite code, even when couple is active (partner already
 joined).

 Solution:
 - Show partner's name when couple is active
 - Only show invite code when couple status is 'pending'

 Need to:
 1. Import usePlayerData hook or fetch partner name
 2. Conditionally render based on coupleData?.status

 {coupleData?.status === 'pending' ? (
   <View style={styles.card}>
     <Text style={styles.label}>Invite Code</Text>
     <Text style={styles.value}>{inviteCode}</Text>
     <Text style={styles.hint}>Share this code with your partner</Text>
   </View>
 ) : (
   <View style={styles.card}>
     <Text style={styles.label}>Partner</Text>
     <Text style={styles.value}>{partnerName}</Text>
   </View>
 )}

 ---
 Fix #10: Acknowledge Screen Back Button Issue

 File: TwoCupsApp/src/screens/AcknowledgeScreen.tsx

 Problem: Lines 145-147 show a "← Back" button that's redundant since this is a tab screen.

 Solution: Remove the back button header section (lines 144-147):
 // DELETE:
 <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
   <Text style={styles.backText}>← Back</Text>
 </TouchableOpacity>

 Also update props interface and remove onGoBack prop since it's no longer needed.

 ---
 Files to Modify

 1. TwoCupsApp/App.tsx - Fix navigation handlers
 2. TwoCupsApp/src/services/api/actions.ts - Add collective cup overflow
 3. firestore.indexes.json - Add suggestions composite index
 4. TwoCupsApp/src/screens/SettingsScreen.tsx - Show partner name for active couples
 5. TwoCupsApp/src/screens/AcknowledgeScreen.tsx - Remove redundant back button

 ---
 Verification

 1. HomeScreen navigation: Tap "Make Request" and "Manage Suggestions" buttons - should navigate
 to respective screens
 2. Collective cup overflow: Acknowledge attempts until collective cup exceeds 100 - should reset
  and continue
 3. Suggestions index: Deploy indexes, then create a suggestion - no console errors about missing
  index
 4. SettingsScreen: When couple is active, should show partner name instead of invite code
 5. AcknowledgeScreen: Should no longer show "← Back" button at top

 Deploy command for indexes:
 firebase deploy --only firestore:indexes