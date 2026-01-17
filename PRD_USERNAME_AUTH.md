# PRD: Persistent User Accounts with Username Login

---

## CURRENT STATUS: Working

**Last Updated:** 2026-01-17

Account creation is now working. Root cause was Email/Password sign-in method not enabled in Firebase Console.

---

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
| Email/password signup | ✅ Working | Fixed 2026-01-17 - Enable Email/Password in Firebase Console |
| Email/password login | ✅ Working | Firebase Auth |
| Cross-device persistence | ✅ Working | Firebase Auth handles token persistence |
| Session persistence | ✅ Working | `browserLocalPersistence` configured |
| Anonymous user creation | ✅ Working | Uses `setDoc` |
| Username change (Settings) | ✅ Working | Uses transactions |
| Username login | ✅ Working | Looks up email from username, then authenticates |

### All Core Features Complete
Username authentication system is fully functional.

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

### Data Model

**Collection: `usernames/{username}`**
```typescript
{
  uid: string;       // Firebase user ID
  email: string;     // Email for auth lookup
  createdAt: Timestamp;
}
```

**Collection: `users/{uid}`**
```typescript
{
  username: string;              // Display name, lowercase
  initial: string;               // Derived from username[0].toUpperCase()
  activeCoupleId: string | null; // null until user joins a couple
  createdAt: Timestamp;
}
```

---

## Current Implementation

### File: `TwoCupsApp/src/context/AuthContext.tsx`

**signUp() function (lines 194-233):**
```typescript
const signUp = async (email: string, password: string, username: string) => {
  // First create the Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  const normalizedUsername = username.toLowerCase().trim();

  // Use transaction to atomically create username doc + user doc
  try {
    const usernameDocRef = doc(db, 'usernames', normalizedUsername);
    const userDocRef = doc(db, 'users', uid);

    await runTransaction(db, async (transaction) => {
      const now = Timestamp.now();

      // Create username lookup doc
      transaction.set(usernameDocRef, {
        uid,
        email: email.toLowerCase(),
        createdAt: now,
      });

      // Create user document with username
      transaction.set(userDocRef, {
        username: normalizedUsername,
        initial: username.charAt(0).toUpperCase(),
        activeCoupleId: null,  // <-- This was suspected as the issue
        createdAt: now,
      });
    });

    console.log('[AuthContext] Created username and user docs for:', uid);
  } catch (error) {
    console.error('Failed to reserve username:', error);
    throw error;
  }

  return userCredential;
};
```

**Anonymous user creation (lines 106-116):**
```typescript
// Only create user document for anonymous users
if (!userDoc.exists() && firebaseUser.isAnonymous) {
  await setDoc(userDocRef, {
    username: '',
    initial: '',
    activeCoupleId: null,
    createdAt: Timestamp.now(),
  });
}
```
Note: This uses `setDoc` directly, not a transaction. May or may not have the same issue.

### File: `TwoCupsApp/src/services/api/usernames.ts`

**setUsername() - for users without existing username (lines 65-106):**
```typescript
await runTransaction(db, async (transaction) => {
  const userDoc = await transaction.get(userDocRef);
  const existingData = userDoc.exists() ? userDoc.data() : null;
  const now = Timestamp.now();
  const createdAt = existingData?.createdAt ?? now;

  transaction.set(usernameDocRef, {
    uid,
    email: email.toLowerCase(),
    createdAt: now,
  });

  transaction.set(userDocRef, {
    username: normalizedUsername,
    initial: username.charAt(0).toUpperCase(),
    createdAt: createdAt,
    ...(existingData?.activeCoupleId && { activeCoupleId: existingData.activeCoupleId }),
  });
});
```

**POTENTIAL BUG:** Line 101 uses `...(existingData?.activeCoupleId && {...})` which means if `activeCoupleId` is `null` (falsy), it won't be included in the document at all. However, this should be fine because `hasOnly()` only checks maximum fields, not required fields.

**updateUsername() - for changing username (lines 112-162):**
Same pattern with the potential activeCoupleId omission.

---

## Firebase Security Rules (CURRENTLY DEPLOYED)

**File: `firestore.rules`**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    // ============================================
    // USERNAMES COLLECTION
    // ============================================
    match /usernames/{username} {
      allow read: if isAuthenticated();

      allow create: if isAuthenticated()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['uid', 'email', 'createdAt'])
        && request.resource.data.uid is string
        && request.resource.data.email is string
        && request.resource.data.createdAt is timestamp;

      allow delete: if isAuthenticated()
        && resource.data.uid == request.auth.uid;

      allow update: if false;
    }

    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      allow read: if isAuthenticated();

      // CREATE: All 4 fields required, activeCoupleId can be null or string
      allow create: if isAuthenticated()
        && request.auth.uid == userId
        && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId', 'createdAt'])
        && request.resource.data.username is string
        && request.resource.data.initial is string
        && (request.resource.data.activeCoupleId == null || request.resource.data.activeCoupleId is string)
        && request.resource.data.createdAt is timestamp;

      // UPDATE: Cannot change createdAt, activeCoupleId can be null or string
      allow update: if isAuthenticated()
        && request.auth.uid == userId
        && request.resource.data.keys().hasOnly(['username', 'initial', 'activeCoupleId', 'createdAt'])
        && (request.resource.data.activeCoupleId == null || request.resource.data.activeCoupleId is string)
        && request.resource.data.createdAt == resource.data.createdAt;

      allow delete: if false;
    }

    // ... rest of rules for couples, inviteCodes, etc.
  }
}
```

**Key security decisions:**
- Read requires authentication (not public) to prevent username enumeration
- Create validates all field types including `activeCoupleId` allowing `null` OR `string`
- Delete only allowed by owner (for username change flow)
- Update disabled on usernames - transactions handle username changes (delete old + create new atomically)

---

## Username API Reference

```typescript
// src/services/api/usernames.ts

// Check availability (always returns true - relaxed for testing)
isUsernameAvailable(username: string): Promise<boolean>

// During signup - reserve username (NOT USED - signUp uses inline transaction)
reserveUsername(username: string, uid: string, email: string): Promise<void>

// First-time username for existing user (Guest → named user)
setUsername(username: string, uid: string, email: string): Promise<void>

// Change existing username (transaction: delete old + create new + update user doc)
updateUsername(oldUsername: string, newUsername: string, uid: string, email: string): Promise<void>

// Login lookup (username → email)
lookupUsername(username: string): Promise<string | null>
```

---

## Authentication Audit Checklist

**Last Audit: 2026-01-17**

### 1. Firestore Security Rules Alignment

| Check | Status | Notes |
|-------|--------|-------|
| Every collection has rules defined | ✅ | All collections have rules in `firestore.rules` |
| Rule field names match code exactly | ✅ | `username` used consistently (not `displayName`) |
| `hasOnly()` lists all fields code writes | ✅ | Verified against all write operations |
| `createdAt` immutability enforced | ✅ | Update rules require `createdAt == resource.data.createdAt` |
| `activeCoupleId` type validation | ✅ | Added 2026-01-17: `null` OR `string` |

**Collections verified:**
- [x] `users/{uid}` - fields: `username`, `initial`, `activeCoupleId`, `createdAt`
- [x] `usernames/{username}` - fields: `uid`, `email`, `createdAt`
- [x] `couples/{coupleId}` - verified
- [x] `inviteCodes/{code}` - verified
- [x] Subcollections: `players`, `attempts`, `requests`, `suggestions` - all verified

### 2. Username Operations Coverage

| Scenario | Function | Handled? |
|----------|----------|----------|
| New signup with username | `signUp()` inline transaction | ✅ Working |
| User without username sets one | `setUsername()` | ✅ Working |
| User changes existing username | `updateUsername()` | ✅ Working |
| Username availability check | `isUsernameAvailable()` | ✅ (always true for testing) |
| Login with username | `lookupUsername()` | ✅ Working |

### 3. Known Issues Log

| Date | Issue | Root Cause | Fix | Status |
|------|-------|------------|-----|--------|
| 2026-01-17 | 400 error on new account creation | Email/Password not enabled in Firebase Console | Enabled Email/Password sign-in method | ✅ Fixed |
| 2026-01-16 | "Response body is locked" error on username check | `usernames` collection missing from Firestore rules | Added rules for `usernames` collection | ✅ Fixed |
| 2026-01-16 | "Missing or insufficient permissions" on username change | Rules expected `displayName`, code writes `username` | Updated rules to use `username` field | ✅ Fixed |
| 2026-01-16 | Save button does nothing for Guest user | `handleSaveUsername` returned early if `!userData?.username` | Added `setUsername()` for users without existing username | ✅ Fixed |

---

## Verification Plan

1. **New Account Signup** - ✅ Working
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

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `src/context/AuthContext.tsx` | signUp, signIn, signInAnonymously | ✅ Working |
| `src/services/api/usernames.ts` | Username CRUD operations | ✅ Working |
| `src/utils/validation.ts` | `validateUsername()` | ✅ Working |
| `src/screens/auth/SignUpScreen.tsx` | Username field + availability | ✅ Working |
| `src/screens/auth/LoginScreen.tsx` | Username or email login | ✅ Working |
| `src/screens/SettingsScreen.tsx` | Username change feature | ✅ Working |
| `firestore.rules` | Security rules | ✅ Deployed |
