# PRD: Persistent User Accounts with Username Login

# new notes from Claude:
 Plan: Fix Account Creation Failure

 Problem

 After implementing Firestore transactions, new account creation fails with a 400
 error.

 Root Cause Analysis

 Issue 1: Missing Type Validation for activeCoupleId in Security Rules

 Location: firestore.rules, lines 68-74

 Current rules for users collection create:
 allow create: if isAuthenticated()
   && request.auth.uid == userId
   && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId',
  'createdAt'])
   && request.resource.data.username is string
   && request.resource.data.initial is string
   && request.resource.data.createdAt is timestamp;

 The code writes:
 transaction.set(userDocRef, {
   username: normalizedUsername,      // string ✓
   initial: username.charAt(0).toUpperCase(),  // string ✓
   activeCoupleId: null,              // null - NOT VALIDATED IN RULES!
   createdAt: now,                    // timestamp ✓
 });

 Problem: The security rules don't validate activeCoupleId type. While hasOnly()
 allows the key to be present, Firestore requires explicit type validation to accept
  null values.

 Issue 2: Same Problem in Anonymous User Creation

 Location: AuthContext.tsx, lines 109-114

 The same issue exists for anonymous user doc creation:
 await setDoc(userDocRef, {
   username: '',
   initial: '',
   activeCoupleId: null,  // Same problem
   createdAt: Timestamp.now(),
 });

 ---
 Solution

 Fix 1: Update Firestore Security Rules

 File: firestore.rules

 Add explicit type validation for activeCoupleId that allows null OR string:

 For users create rule (line 74):
   && (request.resource.data.activeCoupleId == null ||
 request.resource.data.activeCoupleId is string)

 For users update rule:
 Also verify the update rule handles this properly (it uses hasOnly() without type
 checks for activeCoupleId).

 Fix 2: Deploy Updated Rules

 After updating the rules file, deploy with:
 firebase deploy --only firestore:rules

 ---
 Files to Modify
 File: firestore.rules
 Change: Add activeCoupleId type validation (null OR string) for create and update
   rules
 ---
 Detailed Changes

 firestore.rules - Users Collection

 Current (lines 68-74):
 allow create: if isAuthenticated()
   && request.auth.uid == userId
   && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId',
  'createdAt'])
   && request.resource.data.username is string
   && request.resource.data.initial is string
   && request.resource.data.createdAt is timestamp;

 Updated:
 allow create: if isAuthenticated()
   && request.auth.uid == userId
   && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId',
  'createdAt'])
   && request.resource.data.username is string
   && request.resource.data.initial is string
   && (request.resource.data.activeCoupleId == null ||
 request.resource.data.activeCoupleId is string)
   && request.resource.data.createdAt is timestamp;

 Update rule (lines 77-80) - verify it also handles null:
 allow update: if isAuthenticated()
   && request.auth.uid == userId
   && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId',
  'createdAt'])
   && (request.resource.data.activeCoupleId == null ||
 request.resource.data.activeCoupleId is string)
   && request.resource.data.createdAt == resource.data.createdAt;

 ---
 Verification Plan

 1. Deploy rules:
 cd /mnt/c/Users/brett/Documents/GitHub/TwoCups
 firebase deploy --only firestore:rules
 2. Test account creation:
   - Go to the app
   - Create a new account with email/password/username
   - Verify no 400 error
   - Check Firestore Console to confirm both usernames/{username} and users/{uid}
 docs were created
 3. Test anonymous login:
   - Sign out
   - Use "Continue as Guest"
   - Verify user doc is created
 4. Test existing flows:
   - Username change in settings
   - Couple creation/join
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

 Requested permissions:
   · Bash(prompt: deploy firestore rules)


# old notes from Claude:
Plan: Firestore Transaction Fixes & Query Optimization

 Summary

 Fix critical data consistency issues (missing transactions) and eliminate
 bloated/duplicate Firestore calls across the TwoCups app.

 ---
 Phase 1: Username Atomicity (CRITICAL)

 File: TwoCupsApp/src/services/api/usernames.ts

 1.1 setUsername() (lines 64-112)
 - Problem: 2 separate operations without transaction - if second fails, orphaned
 username doc
 - Fix: Wrap in runTransaction - read user doc first, then write both docs
 atomically

 1.2 updateUsername() (lines 118-181)
 - Problem: 3 separate operations (delete old → create new → update user) - any
 failure corrupts state
 - Fix: Wrap in runTransaction - all reads first, then delete/create/update
 atomically

 Imports to add: runTransaction from firebase/firestore

 ---
 Phase 2: Couples Atomicity (CRITICAL)

 File: TwoCupsApp/src/services/api/couples.ts

 2.1 createCouple() (lines 75-83)
 - Problem: Invite code check-then-create race condition
 - Fix: Use runTransaction to atomically check uniqueness and create all docs

 2.2 joinCouple() (lines 155-213)
 - Problem: 4 reads outside batch, then 4 writes in batch - stale data risk
 - Fix: Move all reads inside runTransaction, then write atomically

 ---
 Phase 3: Auth Context Cleanup (HIGH)

 File: TwoCupsApp/src/context/AuthContext.tsx

 3.1 Double user doc creation (lines 103-118, 202-208)
 - Problem: onAuthStateChanged creates user doc, then signUp creates it again
 - Fix: Only create user doc for anonymous users in onAuthStateChanged; let signUp
 be authoritative for email users

 3.2 signUp() transaction
 - Fix: Use runTransaction to atomically create username doc + user doc after Auth
 creation

 ---
 Phase 4: Query Optimization (HIGH)

 File: TwoCupsApp/src/services/api/actions.ts

 4.1 getDailyGemEarnings() (lines 117-160)
 - Problem: 3 separate queries to same collection
 - Fix: Single query for today's attempts, filter in-memory by
 byPlayerId/forPlayerId
 - Savings: 2 reads per call

 4.2 getWeeklyGemStats() (lines 511-570)
 - Problem: 6 queries (3 per player × 2 players)
 - Fix: Single query for week's attempts, calculate both players' gems in-memory
 - Savings: 5 reads per call

 ---
 Phase 5: Hook Optimization (MEDIUM)

 File: TwoCupsApp/src/hooks/usePlayerData.ts

 5.1 Dependency array (line 111)
 - Problem: partnerIds.join(',') creates new string every render, causing listener
 restarts
 - Fix: Use useMemo to compute stable partnerId reference

 5.2 Partner username listener (optional)
 - Consider: Change partnerUser from onSnapshot to one-time getDoc since username
 rarely changes

 ---
 Phase 6: PRD Corrections

 File: PRD_USERNAME_AUTH.md

 Correct false claims:
 - Line 99: Remove "atomic create" - will be atomic after fixes
 - Line 327: Change to "username changes use delete + create within transaction"
 - Line 374: Change "batch writes ensure atomicity" → "transactions with
 read-then-write ensure atomicity"

 Add section documenting transaction patterns after implementation

 ---
 Files to Modify
 File: TwoCupsApp/src/services/api/usernames.ts
 Priority: CRITICAL
 Changes: Add transactions to setUsername, updateUsername
 ────────────────────────────────────────
 File: TwoCupsApp/src/services/api/couples.ts
 Priority: CRITICAL
 Changes: Add transactions to createCouple, joinCouple
 ────────────────────────────────────────
 File: TwoCupsApp/src/context/AuthContext.tsx
 Priority: HIGH
 Changes: Remove double doc creation, add signUp transaction
 ────────────────────────────────────────
 File: TwoCupsApp/src/services/api/actions.ts
 Priority: HIGH
 Changes: Consolidate 3→1 and 6→1 queries
 ────────────────────────────────────────
 File: TwoCupsApp/src/hooks/usePlayerData.ts
 Priority: MEDIUM
 Changes: Fix dependency array
 ────────────────────────────────────────
 File: PRD_USERNAME_AUTH.md
 Priority: LOW
 Changes: Correct false atomicity claims
 ---
 NOT in Scope

 - isUsernameAvailable() - intentionally returns true for testing (per user request)

 ---
 Verification Plan

 Manual Testing

 1. Username operations
   - Sign up → verify both usernames/{name} and users/{uid} created
   - Change username → verify old deleted, new created, user doc updated
   - Simulate failure (disconnect network mid-operation) → verify no orphaned docs
 2. Couple operations
   - Create couple rapidly 10x → verify no duplicate invite codes
   - Two users join same code simultaneously → exactly one succeeds
 3. Query optimization
   - Check Firebase Console usage metrics before/after
   - Compare read counts for daily gems and weekly stats

 Code Verification

 - Run TypeScript build: cd TwoCupsApp && npm run build
 - Run linter: npm run lint
 - Test on device/simulator with network throttling
 

## Objective
Enable users to log into their TwoCups couple account from any device using **username OR email** plus password.

**Success Criteria:**
- Users can sign up with email, password, AND username
- Users can log in with either username or email (+ password)
- Accounts persist across devices and sessions
- Username is unique and serves as display name to partner
- Usernames can be changed in settings

---

## Current State Analysis

### What Already Works
| Feature | Status | Notes |
|---------|--------|-------|
| Email/password signup | ✅ Working | Firebase Auth |
| Email/password login | ✅ Working | Firebase Auth |
| Cross-device persistence | ✅ Working | Firebase Auth handles token persistence |
| Session persistence | ✅ Working | `browserLocalPersistence` configured |

### Gaps to Address
1. **No username field** - login is email-only
2. **displayName is separate** - set during pairing, not during signup

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Username mutability | **Changeable** | Users can update username in settings |
| Username vs displayName | **Username IS display name** | Simplify - remove separate displayName field |
| Existing users | **Require username** | Only test users exist; clean migration |

---

## Technical Approach

### Architecture: Username Lookup Layer
```
User enters "brett" + password
        ↓
Is it an email? (contains @)
    YES → Use email directly
    NO  → Look up username in Firestore
        ↓
Firestore: usernames/{brett} → { uid, email }
        ↓
Get email from lookup
        ↓
Firebase Auth: signInWithEmailAndPassword(email, password)
```

### Data Model Changes

**New Collection: `usernames/{username}`**
```typescript
{
  uid: string;       // Firebase user ID
  email: string;     // Email for auth lookup
  createdAt: Date;
}
```

**Updated User Document: `users/{uid}`**
```typescript
{
  username: string;        // NEW - replaces displayName
  initial: string;         // Derived from username[0]
  activeCoupleId: string | null;
  createdAt: Date;
  // REMOVED: displayName (replaced by username)
}
```

**Updated Couple Flow:**
- Remove displayName input from PairingScreen
- Username is already set during signup
- Initial can be auto-derived or user can customize

---

## Implementation Plan

### Phase 1: Data Model & Types
**File: `src/types/index.ts`**
- Replace `displayName: string` with `username: string` in User interface

### Phase 2: Username Service
**New File: `src/services/api/usernames.ts`**
```typescript
// Check if username is available
async function isUsernameAvailable(username: string): Promise<boolean>

// Reserve username for user (creates username doc)
async function reserveUsername(username: string, uid: string, email: string): Promise<void>

// Update username (change from old to new)
async function updateUsername(oldUsername: string, newUsername: string, uid: string, email: string): Promise<void>

// Lookup email by username (for login)
async function lookupUsername(username: string): Promise<string | null>
```

### Phase 3: Validation Rules
**File: `src/utils/validation.ts`**
- Add `validateUsername()` function
- Rules: 3-20 chars, lowercase alphanumeric + underscores, starts with letter

### Phase 4: Update Signup Flow
**File: `src/screens/auth/SignUpScreen.tsx`**
- Add username field below email
- Real-time availability check (debounced)
- Show ✓/✗ indicator for availability

**File: `src/context/AuthContext.tsx`**
- Update `signUp(email, password, username)` signature
- Reserve username in same transaction as user creation

### Phase 5: Update Login Flow
**File: `src/screens/auth/LoginScreen.tsx`**
- Change "Email" label to "Email or Username"
- Allow input without @ symbol

**File: `src/context/AuthContext.tsx`**
- Update `signIn(identifier, password)` to check for @ symbol
- If no @, lookup username → email, then authenticate

### Phase 6: Update Pairing Flow
**File: `src/screens/auth/PairingScreen.tsx`**
- Remove displayName input (username already exists)
- Keep initial selection OR auto-derive from username[0].toUpperCase()

### Phase 7: Update Settings (Username Change)
**File: `src/screens/SettingsScreen.tsx`**
- Add "Change Username" option
- Modal with: current username, new username input, availability check, save button

### Phase 8: Update All displayName References
- Search for `displayName` across codebase
- Replace with `username` in:
  - HomeScreen partner display
  - HistoryScreen log entries
  - AcknowledgeScreen
  - Any other partner-facing UI

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/types/index.ts` | Modify | `displayName` → `username` |
| `src/services/api/usernames.ts` | **Create** | Username CRUD operations |
| `src/utils/validation.ts` | Modify | Add `validateUsername()` |
| `src/screens/auth/SignUpScreen.tsx` | Modify | Add username field + availability check |
| `src/screens/auth/LoginScreen.tsx` | Modify | Support username or email login |
| `src/context/AuthContext.tsx` | Modify | Update signUp/signIn for username |
| `src/screens/auth/PairingScreen.tsx` | Modify | Remove displayName input |
| `src/screens/SettingsScreen.tsx` | Modify | Add username change feature |
| All screens showing partner name | Modify | Use `username` instead of `displayName` |

---

## UI Mockups

### Sign Up Screen (Updated)
```
┌─────────────────────────────────────┐
│         Create Account              │
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐   │
│  │ brett@example.com           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Username                           │
│  ┌─────────────────────────────┐   │
│  │ brett_smith                 │   │
│  └─────────────────────────────┘   │
│  ✓ Available                        │
│                                     │
│  Password (6+ characters)           │
│  ┌─────────────────────────────┐   │
│  │ ••••••                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Confirm Password                   │
│  ┌─────────────────────────────┐   │
│  │ ••••••                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [        Sign Up         ]         │
└─────────────────────────────────────┘
```

### Login Screen (Updated)
```
┌─────────────────────────────────────┐
│         Welcome Back                │
│                                     │
│  Email or Username                  │
│  ┌─────────────────────────────┐   │
│  │ brett_smith                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  Password                           │
│  ┌─────────────────────────────┐   │
│  │ ••••••                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [         Log In          ]        │
│                                     │
│  [     Continue as Guest    ]       │
└─────────────────────────────────────┘
```

### Pairing Screen (Simplified)
```
┌─────────────────────────────────────┐
│      Create Your Couple             │
│                                     │
│  Your Initial (shown on cups)       │
│  ┌─────────────────────────────┐   │
│  │ B                           │   │ ← Auto-filled from username
│  └─────────────────────────────┘   │
│                                     │
│  [   Generate Invite Code    ]      │
│                                     │
│  Share this code with your partner: │
│                                     │
│         [ ABC123 ]                  │
│                                     │
└─────────────────────────────────────┘
```

---

## Verification Plan

1. **New Account Signup**
   - Create account with email + username + password
   - Verify `usernames/{username}` document created
   - Verify `users/{uid}` has `username` field
   - Try same username again → should fail

2. **Login with Email**
   - Log out, log in with email@domain.com + password ✓

3. **Login with Username**
   - Log out, log in with just username + password ✓

4. **Username Change**
   - Go to Settings → Change Username
   - Enter new available username
   - Verify old username document deleted
   - Verify new username document created
   - Log out, log in with new username ✓

5. **Partner Display**
   - Verify partner sees your username everywhere displayName was shown

6. **Cross-Device**
   - Log in on different browser/device with same credentials
   - Verify same couple data loads

---

## Firebase Security Rules (Deployed)

These rules are in `firestore.rules` and deployed via `firebase deploy --only firestore:rules`:

```javascript
// ============================================
// USERNAMES COLLECTION
// ============================================
match /usernames/{username} {
  // Anyone authenticated can read usernames (for availability checks and login lookup)
  allow read: if isAuthenticated();

  // Users can create a username doc only for themselves
  allow create: if isAuthenticated()
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.keys().hasOnly(['uid', 'email', 'createdAt'])
    && request.resource.data.uid is string
    && request.resource.data.email is string
    && request.resource.data.createdAt is timestamp;

  // Only the owner can delete their username doc (for username changes)
  allow delete: if isAuthenticated()
    && resource.data.uid == request.auth.uid;

  // No updates allowed - delete and recreate for username changes
  allow update: if false;
}

// ============================================
// USERS COLLECTION (username-related fields)
// ============================================
match /users/{userId} {
  allow read: if isAuthenticated();

  allow create: if isAuthenticated()
    && request.auth.uid == userId
    && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId', 'createdAt'])
    && request.resource.data.username is string
    && request.resource.data.initial is string
    && request.resource.data.createdAt is timestamp;

  allow update: if isAuthenticated()
    && request.auth.uid == userId
    && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId', 'createdAt'])
    && request.resource.data.createdAt == resource.data.createdAt;

  allow delete: if false;
}
```

**Key security decisions:**
- Read requires authentication (not public) to prevent username enumeration
- Create validates all field types and ensures `uid` matches authenticated user
- Delete only allowed by owner (for username change flow)
- Update disabled - transactions handle username changes (delete old + create new atomically)

---

## Estimated Scope
- 8 files to modify/create
- Core feature: ~200-300 lines of code
- Low risk - additive changes, doesn't break existing auth flow

---

## Authentication Audit Checklist

This checklist captures learnings from implementation issues. Run through this audit when making auth-related changes.

**Last Audit: 2026-01-16**

### 1. Firestore Security Rules Alignment

| Check | Status | Notes |
|-------|--------|-------|
| Every collection has rules defined | ✅ | All collections have rules in `firestore.rules` |
| Rule field names match code exactly | ✅ | `username` used consistently (not `displayName`) |
| `hasOnly()` lists all fields code writes | ✅ | Verified against all write operations |
| `createdAt` immutability enforced | ✅ | Update rules require `createdAt == resource.data.createdAt` |

**Collections verified:**
- [x] `users/{uid}` - fields: `username`, `initial`, `activeCoupleId`, `createdAt`
- [x] `usernames/{username}` - fields: `uid`, `email`, `createdAt`
- [x] `couples/{coupleId}` - fields: `partnerIds`, `status`, `inviteCode`, `collectiveCupLevel`, `pointsPerAcknowledgment`, `createdAt`, `lastActivityAt`
- [x] `inviteCodes/{code}` - fields: `coupleId`, `creatorId`, `status`, `createdAt`, `expiresAt` (+ `usedBy`, `usedAt` on update)
- [x] Subcollections: `players`, `attempts`, `requests`, `suggestions` - all verified

### 2. Username Operations Coverage

| Scenario | Function | Handled? |
|----------|----------|----------|
| New signup with username | `reserveUsername()` | ✅ Called from `AuthContext.signUp()` |
| User without username sets one | `setUsername()` | ✅ Called from `SettingsScreen.handleSaveUsername()` |
| User changes existing username | `updateUsername()` | ✅ Called from `SettingsScreen.handleSaveUsername()` |
| Username availability check | `isUsernameAvailable()` | ✅ Used in `SignUpScreen` and `SettingsScreen` |
| Login with username | `lookupUsername()` | ✅ Called from `AuthContext.signIn()` |

**Edge cases verified:**
- [x] Guest/anonymous user setting username for first time - `setUsername()` handles this
- [x] User with empty string username (legacy/migration) - `userData?.username` check routes to `setUsername()`
- [x] Attempting to change to same username - `updateUsername()` throws error
- [x] Username taken race condition - transactions with read-then-write ensure atomicity

### 3. User Document States

| State | `userData.username` | Action Required | Code Location |
|-------|---------------------|-----------------|---------------|
| New signup | Set during signup | None | `AuthContext.tsx:193-217` |
| Anonymous user | `''` (empty) | Use `setUsername()` | `AuthContext.tsx:108-113` creates empty |
| Legacy user (pre-username) | `''` or undefined | Use `setUsername()` | `SettingsScreen.tsx:112-122` |
| Active user | Valid username | Use `updateUsername()` | `SettingsScreen.tsx:114-119` |

**Code pattern (verified in `SettingsScreen.tsx:112-123`):**
```typescript
if (userData?.username) {
  // Has username - update flow
  await updateUsername(oldUsername, newUsername, uid, email);
} else {
  // No username - set flow
  await setUsername(newUsername, uid, email);
}
```

### 4. Firestore Rules vs Code Sync

| Collection | Rules Location | Code Location | Verified |
|------------|----------------|---------------|----------|
| `usernames` | `firestore.rules:39-57` | `src/services/api/usernames.ts` | ✅ |
| `users` | `firestore.rules:62-84` | `src/context/AuthContext.tsx`, `src/services/api/usernames.ts`, `src/services/api/couples.ts` | ✅ |
| `couples` | `firestore.rules:89-142` | `src/services/api/couples.ts` | ✅ |
| `inviteCodes` | `firestore.rules:282-309` | `src/services/api/couples.ts` | ✅ |
| `players` | `firestore.rules:147-166` | `src/services/api/couples.ts` | ✅ |
| `attempts` | `firestore.rules:171-200` | `src/services/api/attempts.ts` | ✅ |
| `requests` | `firestore.rules:205-250` | `src/services/api/requests.ts` | ✅ |
| `suggestions` | `firestore.rules:255-276` | `src/services/api/suggestions.ts` | ✅ |

### 5. Error Handling Audit

| Error Scenario | User-Facing Message | Logged? | Code Location |
|----------------|---------------------|---------|---------------|
| Username taken | "Username is already taken" | ✅ Console | `usernames.ts:37,90,141` |
| Permission denied (rules) | Passes through Firebase error | ✅ Console | Various catch blocks |
| Network failure | Generic error via `getErrorMessage()` | ✅ Console | `types/utils.ts` |
| Invalid username format | Validation error shown in UI | ✅ UI only | `validation.ts` |
| Unauthorized operation | "Unauthorized" | ✅ Thrown | `usernames.ts:81,126` |

### 6. UI State Consistency

| Screen | Shows Username | Falls Back To | Code Location | Verified |
|--------|----------------|---------------|---------------|----------|
| Settings | `userData.username` | "Guest" | `SettingsScreen.tsx:40` | ✅ |
| Home (self) | `userData?.username` | "Me" | `HomeScreen.tsx:37` | ✅ |
| Home (partner) | `partnerName` | "Partner" | `usePlayerData.ts:101` | ✅ |
| History | `playerNames[playerId]` | "Unknown" | `HistoryScreen.tsx:194` | ✅ |
| Acknowledge | `partnerNames[playerId]` | "Partner" | `AcknowledgeScreen.tsx:132,258` | ✅ |
| Pairing | `userData?.username` | "User" | `PairingScreen.tsx:183,228` | ✅ |

### 7. Deployment Checklist

Before deploying username-related changes:

- [x] **Firestore rules deployed**: `firebase deploy --only firestore:rules`
- [ ] **Rules tested in Firebase Console**: Use Rules Playground
- [ ] **Web build updated**: Changes reflected in deployed app
- [ ] **Test all user states**: New user, Guest, existing user with username
- [ ] **Test cross-device**: Login with username on different device

### 8. Known Issues & Fixes Log

| Date | Issue | Root Cause | Fix |
|------|-------|------------|-----|
| 2026-01-16 | "Response body is locked" error on username check | `usernames` collection missing from Firestore rules | Added rules for `usernames` collection |
| 2026-01-16 | "Missing or insufficient permissions" on username change | Rules expected `displayName`, code writes `username` | Updated rules to use `username` field |
| 2026-01-16 | Save button does nothing for Guest user | `handleSaveUsername` returned early if `!userData?.username` | Added `setUsername()` for users without existing username |

---

## Quick Reference: Username API

```typescript
// src/services/api/usernames.ts

// Check availability (debounced in UI)
isUsernameAvailable(username: string): Promise<boolean>

// During signup - reserve username
reserveUsername(username: string, uid: string, email: string): Promise<void>

// First-time username for existing user (Guest → named user)
setUsername(username: string, uid: string, email: string): Promise<void>

// Change existing username (transaction: delete old + create new + update user doc)
updateUsername(oldUsername: string, newUsername: string, uid: string, email: string): Promise<void>

// Login lookup (username → email)
lookupUsername(username: string): Promise<string | null>
```
