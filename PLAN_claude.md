# Two Cups - Android App Implementation Plan

## Overview
A React Native couples app where partners "fill each other's cups" by logging actions and acknowledging them. Uses Firebase for real-time sync between partners.

## Tech Stack
- **React Native** with TypeScript
- **Firebase**: simple authentication (email/password) + Firestore (real-time database)
- **Android Studio** for testing

## Core Features (MVP)
1. User authentication (signup/login) - primarily to store activity and interactions
2. Partner pairing via invite code
3a. make a request (something you want your partner to do for you) 
3b. Log an action (something you did for your partner)
4. Acknowledge actions (when partner did something for you)
5. Real-time sync between partners
6. Gem tracking (basic structure, logic added later)
7. Suggestions infrastructure (feature deferred)

---

## Project Structure

```
TwoCups/
├── src/
│   ├── components/
│   │   ├── common/          # Button, Card, Header, LoadingSpinner
│   │   ├── cups/            # CupCard, CollectiveCupCard, CupVisual, GemCounter
│   │   ├── activity/        # TodaysActivity, ActivityCounter
│   │   └── navigation/      # BottomNav
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── LogActionScreen.tsx
│   │   ├── AcknowledgeScreen.tsx
│   │   ├── SuggestScreen.tsx (placeholder)
│   │   ├── auth/            # LoginScreen, SignUpScreen, PairingScreen
│   │   └── settings/        # SettingsScreen
│   ├── services/
│   │   ├── firebase/        # config, auth, firestore
│   │   └── api/             # couples, actions, gems
│   ├── hooks/               # useAuth, useCouple, useActions
│   ├── context/             # AuthContext, CoupleContext
│   ├── types/               # TypeScript interfaces
│   ├── theme/               # colors, typography, spacing
│   └── assets/              # images, icons
├── android/
├── firebase.json
└── firestore.rules
```

---

## Firebase Data Model

### Collections

**users/{userId}**
- email, displayName, initial, coupleId, createdAt

**couples/{coupleId}**
- partner1Id, partner2Id, partner1Name, partner2Name
- partner1Initial, partner2Initial, inviteCode, status
- **Subcollection: stats/current** - gem counts, daily activity

**actions/{actionId}**
- coupleId, actorId, recipientId, description
- status: "pending" | "acknowledged"
- createdAt, acknowledgedAt, gemValue

**invitations/{inviteCode}**
- creatorId, coupleId, status, expiresAt

---

## Key Flows

### Partner Pairing
1. User A signs up → creates couple → gets 6-char invite code
2. User A shares code with partner
3. User B signs up → enters code → joins couple
4. Both now paired and see shared dashboard

### Log & Acknowledge Flow
1. User A logs action ("Made coffee for partner")
2. Action saved with status: "pending"
3. User B sees pending action in real-time
4. User B acknowledges → status: "acknowledged"
5. Gem awarded (logic TBD)

---

## Implementation Phases

### Phase 1: Project Setup
- Initialize React Native TypeScript project
- Set up Firebase project (Auth + Firestore)
- Install dependencies (navigation, firebase, svg)
- Create folder structure and theme

### Phase 2: Authentication
- Build Login/SignUp screens
- Implement AuthContext with Firebase Auth
- Create user documents on signup

### Phase 3: Partner Pairing
- Build PairingScreen (create/join options)
- Implement invite code generation
- Real-time listener for partner joining

### Phase 4: Home Dashboard
- Build HomeScreen matching mockup
- CupCard components with gem display
- TodaysActivity section
- BottomNav (Suggest, Log, Acknowledge)

### Phase 5: Core Actions
- LogActionScreen with description input
- AcknowledgeScreen with pending actions list
- Real-time Firestore listeners
- Update stats on log/acknowledge

### Phase 6: Polish
- Offline support (Firestore persistence)
- Loading/error states
- Basic animations

---

## Key Dependencies

```json
{
  "@react-navigation/native": "^6.x",
  "@react-navigation/native-stack": "^6.x",
  "@react-native-firebase/app": "^18.x",
  "@react-native-firebase/auth": "^18.x",
  "@react-native-firebase/firestore": "^18.x",
  "react-native-svg": "^14.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "date-fns": "^3.x"
}
```

---

## Critical Files to Create

1. `src/services/firebase/config.ts` - Firebase initialization
2. `src/services/api/couples.ts` - Pairing logic (createCouple, joinCouple)
3. `src/services/api/actions.ts` - Log/acknowledge business logic
4. `src/context/AuthContext.tsx` - Auth state management
5. `src/context/CoupleContext.tsx` - Couple data + real-time sync
6. `src/screens/HomeScreen.tsx` - Main dashboard UI

---

## Verification Plan

1. **Auth Flow**: Sign up two test accounts, verify user docs created in Firebase Console
2. **Pairing**: Create couple with user A, join with user B using code, verify couple doc shows both partners
3. **Logging**: User A logs action, verify action doc created with status "pending"
4. **Real-time**: User B's app shows new pending action without refresh
5. **Acknowledge**: User B acknowledges, verify status changes to "acknowledged"
6. **Stats**: Verify TodaysActivity counters update correctly
7. **Android**: Build and run on Android emulator via Android Studio
