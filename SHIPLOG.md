# Two Cups - Ship Log

## 2026-01-15 - UX Improvements & Navigation Consistency

**Status:** Complete

### Problems Solved
1. **Inconsistent form UX** - LogAttemptScreen and MakeRequestScreen showed forms by default, unlike ManageSuggestionsScreen's clean "+ Add" button pattern
2. **Missing bottom navbar** - MakeRequest, ManageSuggestions, and GemHistory screens didn't show the bottom navbar, creating dead ends
3. **Delete buttons not working** - Alert.alert() doesn't work on web, causing delete buttons to fail silently
4. **Inconsistent delete UI** - Delete buttons had different styles across screens
5. **Firestore permission errors** - Delete requests failing due to security rules only allowing status updates
6. **Cluttered first-time UX** - Info boxes remained visible even after users created their first items

### Changes Made

#### 1. Unified Form UX Pattern
Applied ManageSuggestionsScreen's clean pattern to LogAttemptScreen and MakeRequestScreen:
- Added `showForm` state (starts as `false`)
- Added prominent "+ Add Request" / "+ Log an Attempt" buttons
- Forms only appear when button clicked or item tapped
- Cancel/Submit buttons properly sized (flex 1:2 ratio)
- Form disappears after successful submission

**Files Modified:**
- `TwoCupsApp/src/screens/LogAttemptScreen.tsx` - Added showForm toggle, Cancel button
- `TwoCupsApp/src/screens/MakeRequestScreen.tsx` - Added showForm toggle, Cancel button

#### 2. Persistent Bottom Navbar
Moved hidden screens into MainTab navigator for consistent navigation safety:
- Moved `MakeRequest`, `ManageSuggestions`, `GemHistory` from AppStack → MainTab
- Added `tabBarButton: () => null` to hide them from tab bar
- Bottom navbar now visible on ALL post-login screens
- Users can always navigate home or to other main screens

**Files Modified:**
- `TwoCupsApp/App.tsx` - Restructured navigation hierarchy

#### 3. Web-Compatible Delete Functionality
Fixed delete buttons to work on both web and mobile:
- Added Platform.OS detection
- Web: Uses `window.confirm()` for confirmation dialogs
- Mobile: Uses React Native's `Alert.alert()` (for future native apps)
- Both suggestions and requests now delete properly

**Files Modified:**
- `TwoCupsApp/src/screens/ManageSuggestionsScreen.tsx` - Added platform detection
- `TwoCupsApp/src/screens/MakeRequestScreen.tsx` - Added platform detection

#### 4. Consistent Delete Button UI
Standardized delete button appearance across all screens:
- Simple "✕" button in top-right of cards
- fontSize: 18 for consistency
- Same padding and color scheme
- Clean, minimal design

**Files Modified:**
- `TwoCupsApp/src/screens/ManageSuggestionsScreen.tsx` - Updated styles
- `TwoCupsApp/src/screens/MakeRequestScreen.tsx` - Updated styles

#### 5. Fixed Request Deletion (Firestore Rules)
Changed delete behavior to match Firestore security rules:
- Requests can't be truly deleted (per rules: `allow delete: if false`)
- Changed `deleteRequest()` to update status to 'canceled' instead
- Filtered out canceled requests from all displays
- User sees same result (item disappears) without permission errors

**Files Modified:**
- `TwoCupsApp/src/services/api/actions.ts` - Changed deleteDoc → updateDoc
- `TwoCupsApp/src/screens/MakeRequestScreen.tsx` - Filter out canceled requests

#### 6. Context-Aware Info Boxes
Info boxes now only show for first-time users:
- ManageSuggestionsScreen: Hidden when `suggestions.length > 0`
- MakeRequestScreen: Hidden when `visibleRequests.length > 0`
- Cleaner UI after users understand the feature

**Files Modified:**
- `TwoCupsApp/src/screens/ManageSuggestionsScreen.tsx` - Conditional rendering
- `TwoCupsApp/src/screens/MakeRequestScreen.tsx` - Conditional rendering

### User Flow Improvements

**Before:**
- Forms always visible (cluttered)
- No navbar on some screens (dead ends)
- Delete buttons don't work on web
- Info boxes always showing

**After:**
- Clean "+ Add" buttons → form appears → submit → form disappears
- Bottom navbar persistent everywhere (safety & user confidence)
- Delete works on all platforms
- Info boxes only for first-time users

### Verification
- ✅ TypeScript compilation passes
- ✅ Web build successful
- ✅ All three screens follow identical UX pattern
- ✅ Bottom navbar visible on all post-login screens
- ✅ Delete buttons functional on web (window.confirm)
- ✅ Requests marked as canceled (no permission errors)
- ✅ Info boxes hide after first use

### Deployed
- Build: `npm run build:web`
- Deploy: `firebase deploy --only hosting`
- Live at: https://twocups-2026.web.app

---

## 2026-01-15 - US-039: TypeScript Type Safety Improvements

**Status:** Complete

### Problem Solved
Codebase had 14 instances of `any` types, reducing type safety and making runtime errors harder to catch at compile time. Console was showing runtime type errors related to browser API checks.

### Changes Made

#### 1. Created Type Utilities (`src/types/utils.ts`)
- `isError()`, `hasMessage()`, `hasCode()` - Type guards for error handling
- `getErrorMessage()` - Safely extracts error messages from unknown errors
- `isFirebaseError()` - Type guard for Firebase auth errors
- `FirebaseError` interface

#### 2. Created Browser API Types (`src/types/browser.ts`)
- `BeforeInstallPromptEvent` interface for PWA install prompts
- Extended Window/Navigator interfaces for PWA features

#### 3. Fixed All Error Handling
Changed all catch blocks from `error: any` to `error: unknown` with proper type guards:
- Auth screens: LoginScreen, SignUpScreen, PairingScreen
- Main screens: LogAttemptScreen, AcknowledgeScreen, MakeRequestScreen, ManageSuggestionsScreen
- All `error.message` → `getErrorMessage(error)` for safe access

#### 4. Fixed Navigation Types
- App.tsx: Changed `navigation: any` → `NativeStackNavigationProp<AppStackParamList>`

#### 5. Fixed Browser API Runtime Errors
- Simplified browser property checks to avoid runtime errors
- Changed from complex type guards to simple type assertions
- Fixed console errors related to `window.MSStream` and `navigator.standalone` checks

### Files Created
- `TwoCupsApp/src/types/utils.ts` - Error handling utilities
- `TwoCupsApp/src/types/browser.ts` - Browser API type extensions

### Files Modified (10)
- `TwoCupsApp/App.tsx`
- `TwoCupsApp/src/hooks/useInstallPrompt.ts`
- All auth screens (3 files)
- Main screens (4 files)

### Verification
- ✅ TypeScript compilation passes
- ✅ Zero `any` types in codebase
- ✅ Web build successful
- ✅ Console runtime errors resolved

---

## 2026-01-15 - PWA Update System (Auto-refresh for installed apps)

**Status:** Complete - Ready to deploy

### Problem Solved
PWA installed via "Add to Homescreen" on Android was caching old versions and not picking up new deployments. Users had to manually clear cache or reinstall.

### Solution Implemented
Multi-layered approach to ensure PWA always gets fresh content:

#### 1. Firebase Hosting Cache Headers (`firebase.json`)
- `index.html`: `no-cache, no-store, must-revalidate` - forces fresh check
- `sw.js`: `no-cache` - service worker always checks for updates
- `manifest.json`: `no-cache` - manifest always fresh
- JS/CSS with hashes: long cache (they get new names per build)

#### 2. Service Worker (`public/sw.js`)
- **Network-first** strategy for HTML - always tries fresh content
- **Cache-first** for hashed assets (performance optimization)
- Auto-checks for updates on every page load
- Notifies the app when updates are available
- Takes control immediately on activation

#### 3. Update Prompt UI (`UpdatePrompt.tsx`)
- Shows notification banner when new version available
- "Refresh" button to apply update immediately
- "Later" button to dismiss (update applies on next visit)
- Slides in from top with animation

#### 4. Post-Build Script (`scripts/post-build.js`)
- Injects service worker registration into index.html
- Adds PWA manifest link and Apple meta tags
- Copies icon assets to dist folder
- Sets dark background to prevent white flash

### Files Created
- `TwoCupsApp/public/sw.js` - Service worker
- `TwoCupsApp/public/manifest.json` - PWA manifest
- `TwoCupsApp/scripts/post-build.js` - Build post-processing
- `TwoCupsApp/src/components/common/UpdatePrompt.tsx` - Update UI

### Files Modified
- `firebase.json` - Added cache control headers
- `TwoCupsApp/package.json` - Updated build:web script
- `TwoCupsApp/src/components/common/index.ts` - Export UpdatePrompt
- `TwoCupsApp/App.tsx` - Added UpdatePrompt component

### How Updates Work Now
1. User opens installed PWA
2. Service worker checks for new version in background
3. If update found, shows "Update Available" banner
4. User taps "Refresh" to get new version instantly
5. Or dismisses and gets update on next visit

---

## 2026-01-15 - US-038: App Icon and Splash Screen

**Status:** Complete - Ready to deploy

### What Was Implemented
Created branded app icon and splash screen matching the Two Cups theme.

### Design
- **Concept:** Two cups (purple and gold) tilting toward each other with a heart between them
- **Colors:** Primary purple (#8B5CF6), Gold (#FFD700), Dark background (#0F0F0F)
- **Style:** Clean, minimal, works at small sizes

### Icons Generated
- `icon.png` (1024x1024) - Main app icon for iOS
- `adaptive-icon.png` (1024x1024) - Android adaptive icon foreground
- `splash-icon.png` (288x288) - Splash screen logo
- `favicon.png` (48x48) - Web favicon

### Configuration Changes (`app.json`)
- App name: "Two Cups"
- `userInterfaceStyle`: "dark"
- `splash.backgroundColor`: "#0F0F0F"
- `android.adaptiveIcon.backgroundColor`: "#0F0F0F"
- Added `ios.bundleIdentifier`: "com.twocups.app"
- Added `expo-splash-screen` plugin

### Splash Screen Behavior
- Installed `expo-splash-screen` package
- `SplashScreen.preventAutoHideAsync()` on app load
- `SplashScreen.hideAsync()` when app is ready
- No white flash between splash and app content

### Files Created
- `TwoCupsApp/scripts/generate_icons.py` - Python script to regenerate icons
- `TwoCupsApp/assets/icon.png` - App icon
- `TwoCupsApp/assets/adaptive-icon.png` - Android adaptive icon
- `TwoCupsApp/assets/splash-icon.png` - Splash icon
- `TwoCupsApp/assets/favicon.png` - Web favicon

### Files Modified
- `TwoCupsApp/app.json` - Icon and splash configuration
- `TwoCupsApp/App.tsx` - Splash screen handling
- `TwoCupsApp/package.json` - Added expo-splash-screen dependency

### Acceptance Criteria Met
- [x] App icon designed (Two Cups theme)
- [x] Icon configured for all Android & iOS densities
- [x] Splash screen shows app logo on launch
- [x] Splash screen transitions smoothly to app
- [x] No white flash between splash and app

---

## 2026-01-15 - Git Configuration & Workflow Setup

**Status:** Configured for GitHub Desktop workflow

### Problem Solved
Git push was stuck/hanging when attempting to push to origin. Issue was caused by SSH authentication waiting for passphrase input in WSL environment.

### Configuration Changes
1. Killed stuck git push process
2. Pulled and merged remote changes (resolved diverged branches)
3. Removed CLI-specific git settings that interfere with GitHub Desktop:
   - Removed `core.sshCommand` batch mode setting
   - Removed `push.timeout` setting

### Current Workflow
- **Coding:** Claude Code handles all code changes
- **Git Operations:** GitHub Desktop handles all commits, pushes, and pulls
- **Remote:** SSH configured via `git@github.com:bmccall17/TwoCups.git`

### Git Status
- Branch synced with origin/main
- Clean minimal configuration (user.name, user.email only)
- Ready for GitHub Desktop management

---

## 2026-01-15 - Collaborative Transformation

**Status:** Deployed - UI transformed from competitive to collaborative framing

### What Changed
Removed all competitive "VS" elements that pit partners against each other. The app now aligns with the README's core philosophy: "No scorekeeping - The goal is attunement, not optimization."

### Files Modified
- **GemLeaderboard.tsx** - Complete transformation
  - "Gem Leaderboard" → "Our Shared Journey"
  - Removed "Gem Champion" labels and leader logic
  - Added prominent combined total display
  - New collaborative messages ("Y'all are building something beautiful together!")
  - Icons: 🏆 → 💫

- **GemCounter.tsx** - Softened framing
  - "Gem Treasury" → "Shared Gems"
  - "You're on fire!" → "So much care flowing today!"

- **HistoryScreen.tsx** - Analytics section
  - "🏆 Leaderboard" → "💫 Our Journey"
  - Individual gem comparison replaced with "Total Gems Together"

- **MilestoneCelebrationContext.tsx** - Message softening
  - "crushing it" → "gems of care shared"
  - Badges: 🏆👑 → 🌸💕

### Documentation Updated
- `Items That May Fall Outside Intended Exp.md` - Marked all items as addressed, added language guidelines

### Deployed
- **Live URL**: https://twocups-2026.web.app
- All changes verified and deployed via `npm run deploy`

---

## 2026-01-12 - Project Paused

**Status:** On hold - authentication flow issues need investigation

last message from Claude:
  Quick things to check in Firebase Console when you return:
  1. Authentication > Sign-in method - Verify "Anonymous" is enabled
  2. Authentication > Settings > Authorized domains - Add localhost if missing
  3. Firestore Database - Check if any documents were created (users, couples, inviteCodes)
  The core game logic and UI structure are in place. The auth flow just needs debugging - likely a configuration issue in Firebase Console rather than code.

### What Works
- Firebase project and hosting configured
- Expo web build and deployment pipeline
- Firestore security rules deployed
- Basic UI screens (Login, SignUp, Pairing, Home placeholder)
- API services written (createCouple, joinCouple, logAttempt, acknowledgeAttempt)

### Known Issues
- Anonymous auth + couple creation flow not working reliably in browser
- Possible issues with Firestore listeners or auth state persistence
- Need to investigate browser console errors more thoroughly

### Recommendations for Next Session
1. Consider using Firebase Auth Emulator for local testing
2. May need to add web app to Firebase Console (Authentication > Settings > Authorized domains)
3. Check if anonymous auth is enabled in Firebase Console
4. Consider starting fresh with a simpler auth flow (email/password only)

### Files Changed This Session
- `TwoCupsApp/src/context/AuthContext.tsx` - Added coupleData listener
- `TwoCupsApp/src/screens/auth/PairingScreen.tsx` - Added useEffect for async coupleData
- `TwoCupsApp/src/services/firebase/config.ts` - Added explicit auth persistence
- `TwoCupsApp/src/services/api/couples.ts` - Fixed crypto.randomUUID → Firestore auto-ID
- `TwoCupsApp/App.tsx` - Navigation checks couple status instead of just activeCoupleId

---

## 2026-01-12 - Clean Baseline Plan Created

**Status:** Plan documented, ready to execute
**See:** `CLEAN_BASELINE_PLAN.md` for full instructions

### Quick Summary
- Current app works and is deployed to https://twocups-2026.web.app
- Plan created to make a clean `TwoCupsApp_clean/` folder
- Copy only source files, reinstall deps fresh
- No code changes, just folder reorganization

---

## 2026-01-12 - Expo Migration & Web Deployment

### Major Change: React Native → Expo
- Migrated from bare React Native to Expo for web support
- Switched from `@react-native-firebase/*` to Firebase JS SDK
- Now supports: **Web**, Android, iOS from single codebase

### Deployed
- **Live URL**: https://twocups-2026.web.app
- Hosted on Firebase Hosting (free tier)
- Deploy command: `npx expo export --platform web && firebase deploy --only hosting`

### Architecture
```
TwoCupsApp/          # Expo project
├── src/
│   ├── services/firebase/config.ts  # Firebase JS SDK
│   ├── services/api/                # Client-side Firestore operations
│   ├── context/AuthContext.tsx      # Auth state management
│   ├── screens/                     # Login, SignUp, Pairing, Home
│   └── components/common/           # Button, TextInput, LoadingSpinner
├── dist/            # Web build output (deployed to Firebase Hosting)
└── app.json         # Expo config
```

### Pending
- [ ] Add Web app in Firebase Console (for proper auth domain)
- [ ] Test full auth flow in browser
- [ ] Test couple pairing flow
- [ ] Build HomeScreen with cup visualization

---

## 2026-01-12 - Infrastructure Setup (v0.0.1)

### Completed
- [x] Firebase project created (`twocups-2026`)
- [x] React Native project initialized with TypeScript
- [x] React Native Firebase SDK installed and configured
- [x] Firestore security rules written and deployed
- [x] Firestore indexes configured
- [x] Cloud Functions written (pending deployment strategy)
- [x] Client folder structure created per PLAN_claude.md
- [x] Auth context implemented
- [x] Login/SignUp/Pairing screens implemented
- [x] Basic HomeScreen placeholder

### Architecture Decisions

**Authentication: Anonymous Auth (for now)**
- Decision: Using Anonymous authentication for initial development
- Rationale: Faster iteration, simpler testing, no forms to fill
- Tradeoff: Accounts are device-bound. If user clears app data, uninstalls, or switches devices, account is lost forever along with couple pairing and history.
- Future: Will add Email/Password before production release for account recovery and device portability.

**Cost Strategy: No Blaze Plan**
- Decision: Running on Firebase free tier (Spark plan) only
- Impact: Cloud Functions cannot be deployed (requires Blaze)
- Workaround: Moving server-side logic to client-side with Firestore security rules
- Tradeoff: Less anti-cheat protection, but acceptable for trusted users ("known players")

### Pending
- [x] Refactor Cloud Functions logic to client-side
- [x] Update security rules for client-side writes
- [ ] Test full auth flow in Android Studio
- [ ] Test couple pairing flow
- [ ] Build HomeScreen with cup visualization

### Files Created (Client-Side API)
```
TwoCupsApp/src/services/api/
├── index.ts
├── couples.ts    # createCouple(), joinCouple()
└── actions.ts    # logAttempt(), acknowledgeAttempt(), createRequest()
```

---
