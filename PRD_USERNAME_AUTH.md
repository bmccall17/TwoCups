# PRD: Persistent User Accounts with Username Login

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

// Reserve username for user (atomic create)
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

## Firebase Security Rules (Manual Update)

Add to Firestore rules in Firebase Console:

```javascript
match /usernames/{username} {
  // Anyone can read (for availability checks and login lookup)
  allow read: if true;

  // Only authenticated users can create, and document must not exist
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid;

  // Only owner can delete (for username changes)
  allow delete: if request.auth != null
                && resource.data.uid == request.auth.uid;

  // No updates - delete and recreate for changes
  allow update: if false;
}
```

---

## Estimated Scope
- 8 files to modify/create
- Core feature: ~200-300 lines of code
- Low risk - additive changes, doesn't break existing auth flow
