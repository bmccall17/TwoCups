prd v0.0.1 - Infrastructure & Platform Setup (v0.0.1)

Excellent — this is the right moment to lock the **infrastructure PRD** before any UI or feature logic hardens. Below is a **complete, implementation-ready PRD** for the **Initial Infrastructure Setup** of *Two of Cups*, aligned to your plans, Firebase-first, and intentionally shaped to support everything you already designed in Figma without repainting later.

This PRD is about making sure the *spine* of the system is correct, secure, and extensible.

---

# Product Requirements Document

## Two of Cups — Infrastructure & Platform Setup (v0.0.1)

### Status

Approved for implementation

### Owner

Brett

### Target Outcome

A secure, scalable, Firebase-backed foundation that supports:

* Paired-user relationships (1 couple = 2 players)
* Real-time shared state
* Server-authoritative game logic
* Clean separation between client intent and server truth
* Future expansion (analytics, notifications, achievements) without schema rewrites

---

## 1. Purpose & Scope

### Purpose

Establish the **technical infrastructure** required to support the Two of Cups core experience, ensuring that:

* All game state is consistent and cheat-resistant
* Real-time updates feel immediate and relational
* The data model cleanly expresses *relationship-first* logic
* The system can evolve without breaking early users

### In Scope

* Firebase project setup
* Simple Authentication - this wont be published outside known players for now
* Firestore schema
* Cloud Functions (authoritative logic)
* Security rules
* Environment configuration
* Deployment & developer ergonomics

### Explicitly Out of Scope (for this PRD)

* UI polish
* Animations
* Push notifications
* Analytics dashboards
* Monetization
* Multi-couple support per user (future)

---

## 2. Guiding Architectural Principles

1. **Couple is the primary domain object**
   Everything meaningful lives *under a couple*.

2. **Clients request, servers decide**
   Clients express intent; Cloud Functions enforce rules and mutate rewards.

3. **Realtime by default**
   Firestore listeners power the experience, not polling.

4. **Minimal but expressive schema**
   No premature optimization, no dead fields.

5. **Anti-gaming baked in at the infrastructure layer**
   Limits, validation, and rewards are enforced server-side.

---

## 3. Technology Stack

### Core Platform

* **Firebase**

  * Authentication (simple name + password initially)
  * Firestore (Native mode)
  * Cloud Functions (Node.js / TypeScript)
  * Security Rules

### Client Assumptions

* React Native (bare workflow, not Expo)
* TypeScript
* React Native Firebase SDK (`@react-native-firebase/*` v18+)

---

## 4. Authentication & Identity

### Auth Method

* Email + Password (initial)
* Anonymous auth **not** supported (relationship integrity matters)

### User Record Creation

On first successful auth:

* Create `users/{uid}` document
* No game state stored here beyond identity + active couple reference

#### users/{uid}

```ts
{
  displayName: string
  initial: string        // single character
  activeCoupleId: string | null
  createdAt: Timestamp
}
```

---

## 5. Domain Model (Firestore Schema)

### Top-Level Collections

```
users
couples
inviteCodes
```

---

### couples/{coupleId}

Represents exactly **two people in relationship**.

```ts
{
  partnerIds: [uidA, uidB]        // length must be ≤ 2
  status: 'pending' | 'active'
  inviteCode: string
  pointsPerAcknowledgment: number // default: 5
  collectiveCupLevel: number      // 0–100
  createdAt: Timestamp
  lastActivityAt: Timestamp
}
```

#### Subcollections

##### couples/{coupleId}/players/{uid}

```ts
{
  cupLevel: number        // 0–100
  gemCount: number
  joinedAt: Timestamp
}
```

##### couples/{coupleId}/attempts/{attemptId}

```ts
{
  byPlayerId: uid
  forPlayerId: uid
  action: string
  description?: string
  category?: string
  createdAt: Timestamp
  acknowledged: boolean
  acknowledgedAt?: Timestamp
  fulfilledRequestId?: string
}
```

##### couples/{coupleId}/requests/{requestId}

```ts
{
  byPlayerId: uid
  forPlayerId: uid
  action: string
  description?: string
  category?: string
  status: 'active' | 'fulfilled' | 'canceled'
  createdAt: Timestamp
  fulfilledAt?: Timestamp
  fulfilledByAttemptId?: string
}
```

##### couples/{coupleId}/suggestions/{suggestionId}

```ts
{
  forPlayerId: uid
  createdByPlayerId: uid
  action: string
  category?: string
  isRecurring: boolean
  usageCount: number
  createdAt: Timestamp
}
```

---

### inviteCodes/{inviteCode}

```ts
{
  coupleId: string
  creatorId: uid
  status: 'active' | 'used' | 'expired'
  createdAt: Timestamp
  expiresAt: Timestamp
}
```

---

## 6. Cloud Functions (Authoritative Logic)

All functions are **callable HTTPS functions**.

### 6.1 createCouple()

**Caller:** authenticated user
**Behavior:**

* Creates couple with caller as first partner
* Generates unique invite code
* Creates players/{uid} record
* Sets user.activeCoupleId

---

### 6.2 joinCouple(inviteCode)

**Caller:** authenticated user
**Validation:**

* Invite exists, active, not expired
* Couple has only one partner
* Caller is not already in another active couple

**Behavior:**

* Adds second partner
* Creates players/{uid}
* Activates couple
* Marks invite as used

---

### 6.3 logAttempt(payload)

```ts
{
  forPlayerId: uid
  action: string
  description?: string
  category?: string
}
```

**Server Responsibilities**

* Enforce daily attempt limit (20)
* Prevent self-attempts
* Detect matching active request (case-insensitive trim match)
* Award gems:

  * +1 base
  * +2 bonus if fulfilling request
* Create attempt record
* Update lastActivityAt

---

### 6.4 acknowledgeAttempt(attemptId)

**Validation**

* Caller is the recipient
* Attempt exists and is unacknowledged

**Rewards (Server-Enforced)**

* +3 gems to each player
* +3 to collective cup
* Increase recipient cup by `pointsPerAcknowledgment`
* Handle overflow (cup ≥ 100)

**Behavior**

* Mark attempt acknowledged
* Return overflow flag for UI celebration

---

## 7. Security Rules (High-Level)

### Principles

* Only couple participants can read their data
* Clients cannot mutate:

  * cupLevel
  * gemCount
  * acknowledgment fields
* Only Cloud Functions may perform reward updates

### Examples

* Users can read/write their own user doc
* Couple access requires `request.auth.uid in couple.partnerIds`
* Attempt creation allowed; acknowledgment updates blocked client-side

(Exact rules to be written after schema creation.)

---

## 8. Indexes Required

Firestore composite indexes:

* attempts by `forPlayerId + acknowledged + createdAt`
* attempts by `byPlayerId + createdAt`
* requests by `forPlayerId + status`
* suggestions by `forPlayerId`

---

## 9. Environment Configuration

### Firebase Environments

* `dev`
* `prod`

### Required Env Vars

* Firebase project IDs
* Functions region
* Invite expiration duration
* Daily attempt limit (configurable)

---

## 10. Non-Functional Requirements

### Performance

* All dashboard views must be satisfied with ≤ 3 listeners
* Cold start acceptable for first invocation only

### Reliability

* Functions must be idempotent where possible
* Partial failures must not corrupt reward state

### Scalability

* No fan-out writes in client
* Server handles all reward fan-out

---

## 11. Definition of Done (Infrastructure)

- [x] Firebase project created
- [ ] Auth working end-to-end
- [ ] Couples can be created and joined
- [ ] Attempts logged via Cloud Function
- [ ] Acknowledgments processed server-side
- [ ] Rewards correctly applied
- [x] Security rules prevent client cheating
- [ ] Emulator suite passes core flows

---

## 12. Immediate Next Steps (Recommended Order)

- [x] 1. Create Firebase project(s)
- [x] 2. Initialize React Native project with TypeScript
- [x] 3. Install and configure React Native Firebase SDK
- [x] 4. Define Firestore schema (indexes configured)
- [x] 5. Write Firestore security rules (client-side writes enabled)
- [x] 6. Implement client-side API services (NO Cloud Functions - free tier):
  - [x] 6a. createCouple() - client-side
  - [x] 6b. joinCouple(inviteCode) - client-side
  - [x] 6c. logAttempt(payload) - client-side
  - [x] 6d. acknowledgeAttempt(attemptId) - client-side
- [x] 7. Implement Auth context + screens (client)
- [x] 8. Implement couple creation + joining screens (client)
- [ ] 9. Test in Android Studio
- [ ] 10. Build HomeScreen with cup visualization

---

## Notes

**Alignment with PLAN_claude.md:** This PRD supersedes the original plan for infrastructure decisions. Key evolutions:
- Data model nests `attempts/`, `requests/`, `suggestions/` under couples (better security/access patterns)
- Uses `activeCoupleId` on users (supports future multi-couple scenarios)
- Client uses React Native Firebase SDK (`@react-native-firebase/*`) per original plan

**Architecture Change (2026-01-12):** Moved from Cloud Functions to client-side API services to stay on Firebase free tier (Spark plan). Trade-offs:
- No server-side daily attempt limit enforcement (honor system)
- No server-side anti-cheat for gem/cup values
- Acceptable for trusted users ("known players" per PRD scope)
- Cloud Functions code retained in `/functions` for future Blaze upgrade if needed