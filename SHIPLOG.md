# Two Cups - Ship Log

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
