# Gem System As-Is Report

**Audit Date:** 2026-01-19
**Auditor:** Claude Code
**Scope:** As-is audit of the gem/cup economy system implementation

---

## Overview

The TwoCups app implements a **gem and cup economy** for couples. The system tracks:
- **Gems**: A currency earned by both partners through actions and acknowledgments
- **Individual Cups**: Each partner has a cup (0-100 scale) that fills based on acknowledgments
- **Collective Cup**: A shared cup (0-100 scale) that fills when either partner acknowledges

The economy is **fully client-side computed** with Firestore as the persistence layer. Cloud Functions exist but appear to be an alternative/backup implementation. Security rules enforce data integrity.

**Keywords NOT found in codebase:**
- `liquid` - Not implemented
- `ledger` - Not implemented (history derived from attempts)
- `streak` - Not implemented

---

## Economy Entities

### 1. Gems

Gems are a numeric counter stored on each player. There is **only one gem type** (no Emerald/Sapphire/Ruby/Diamond variants exist in code).

**Source:** `TwoCupsApp/src/services/api/actions.ts:22-28`
```typescript
const BASE_GEM_AWARD = 1;
const REQUEST_FULFILLMENT_BONUS = 2;
const ACK_GEM_AWARD = 3;
```

**Gem earning events:**
| Event | Gems | Recipient |
|-------|------|-----------|
| Log an attempt | +1 | Actor (person who logged) |
| Log attempt that fulfills a request | +3 total (+1 base, +2 bonus) | Actor |
| Partner acknowledges your attempt | +3 | Actor |
| You acknowledge partner's attempt | +3 | You (acknowledger) |

### 2. Cups

**Individual Cup (`cupLevel`):**
- Range: 0-100
- Stored on: `/couples/{coupleId}/players/{uid}.cupLevel`
- Fills when: You acknowledge an attempt done for you
- Fill amount: `pointsPerAcknowledgment` (default: 5)
- Overflow: When >= 100, resets to `(level - 100)`

**Collective Cup (`collectiveCupLevel`):**
- Range: 0-100
- Stored on: `/couples/{coupleId}.collectiveCupLevel`
- Fills when: Any acknowledgment occurs
- Fill amount: 3 points per acknowledgment (`ACK_COLLECTIVE_CUP_AWARD`)
- Overflow: Same as individual cups

**Source:** `TwoCupsApp/src/services/api/actions.ts:349-379`

### 3. Attempts

An attempt represents an action one partner did for the other.

**Fields:**
- `byPlayerId`: Who did the action
- `forPlayerId`: Who it was done for
- `action`: Text description
- `description`: Optional details
- `category`: Optional category (9 love language categories)
- `createdAt`: Timestamp
- `acknowledged`: Boolean
- `acknowledgedAt`: Timestamp (when acknowledged)
- `fulfilledRequestId`: Links to request if this fulfilled one

**Source:** `TwoCupsApp/src/types/index.ts:36-47`

### 4. Requests

A request is something one partner asks the other to do.

**Fields:**
- `byPlayerId`: Who made the request
- `forPlayerId`: Who should fulfill it
- `action`: What is being requested
- `status`: `'active' | 'fulfilled' | 'canceled'`
- `fulfilledAt`: Timestamp
- `fulfilledByAttemptId`: Links to fulfilling attempt

**Source:** `TwoCupsApp/src/types/index.ts:50-61`

### 5. Suggestions

Ideas for ways to fill a partner's cup (no gem bonus).

**Fields:**
- `byPlayerId`: Creator
- `action`: Suggested action
- `category`: Optional category

**Source:** `TwoCupsApp/src/types/index.ts:64-71`

---

## Event Flow Table

| User Action | Trigger | Validation | Writes | Reads | Computed Values |
|-------------|---------|------------|--------|-------|-----------------|
| **Log Attempt** | Button in LogAttemptScreen | Daily limit (20), not self, action required | attempts/{id}, players/{uid}.gemCount, requests/{id}.status (if fulfilling) | requests (to check fulfillment), attempts (daily count) | gemsAwarded (1 or 3) |
| **Acknowledge Attempt** | Button in AcknowledgeScreen | Must be recipient, not already acked | attempts/{id}.acknowledged, players/{actor}.gemCount, players/{recipient}.gemCount + cupLevel, couples/{id}.collectiveCupLevel | attempt, couple (pointsPerAck), player (cupLevel) | cupOverflow, collectiveCupOverflow |
| **Create Request** | Button in MakeRequestScreen | Active limit (5), action required | requests/{id} | requests (active count) | - |
| **Delete Request** | Button in MakeRequestScreen | Must be creator, must be active | requests/{id}.status='canceled' | request | - |
| **Create Suggestion** | Button in ManageSuggestionsScreen | Action required | suggestions/{id} | - | - |
| **Delete Suggestion** | Button in ManageSuggestionsScreen | Must be creator | DELETE suggestions/{id} | suggestion | - |

---

## Persistence Model (Firestore)

### Collections

**`/users/{uid}`**
```typescript
{
  username: string;
  initial: string;
  activeCoupleId: string | null;
  createdAt: Date;
}
```

**`/couples/{coupleId}`**
```typescript
{
  partnerIds: string[];          // Array of 2 UIDs
  status: 'pending' | 'active';
  inviteCode: string;
  pointsPerAcknowledgment: number;  // Default: 5
  collectiveCupLevel: number;       // 0-100
  createdAt: Date;
  lastActivityAt: Date;
}
```

**`/couples/{coupleId}/players/{uid}`**
```typescript
{
  cupLevel: number;              // 0-100
  gemCount: number;              // Total gems earned
  joinedAt: Date;
  achievedMilestones?: number[]; // For milestone celebrations
}
```

**`/couples/{coupleId}/attempts/{attemptId}`**
```typescript
{
  byPlayerId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  fulfilledRequestId?: string;
}
```

**`/couples/{coupleId}/requests/{requestId}`**
```typescript
{
  byPlayerId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  status: 'active' | 'fulfilled' | 'canceled';
  createdAt: Date;
  fulfilledAt?: Date;
  fulfilledByAttemptId?: string;
}
```

**`/couples/{coupleId}/suggestions/{suggestionId}`**
```typescript
{
  byPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  createdAt: Date;
}
```

**`/inviteCodes/{code}`**
```typescript
{
  coupleId: string;
  creatorId: string;
  status: 'active' | 'used';
  createdAt: Date;
  expiresAt: Date;
}
```

### Security Rules Summary

**Source:** `firestore.rules`

| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| users | Own doc only | Any authenticated | Own doc, preserve createdAt | No |
| couples | First partner only | Partners or pending status | Join flow or partner updates | No |
| players | Own doc, cupLevel=0, gemCount=0 | Partners only | Partners, preserve joinedAt | No |
| attempts | Partners, not self, acked=false | Partners only | Recipient only, acked transition | No |
| requests | Partners, status=active | Partners only | Cancel (creator) or fulfill (recipient) | No |
| suggestions | Own suggestions | Partners only | Owner only | Owner only |
| inviteCodes | Creator is self | Any authenticated | active->used transition | No |

---

## Computation Model

### Where Totals Are Calculated

**Client-side (primary):** `TwoCupsApp/src/services/api/actions.ts`
- `logAttempt()` - Calculates gems (lines 248-252)
- `acknowledgeAttempt()` - Calculates cup overflow, gems (lines 349-392)
- `getDailyAttemptsInfo()` - Counts today's attempts (lines 77-102)
- `getDailyGemEarnings()` - Calculates daily gem totals (lines 108-172)
- `getWeeklyGemStats()` - Calculates weekly stats (lines 523-590)

**Server-side (Cloud Functions):** `functions/src/index.ts`
- Mirrors client logic but appears to be used for couple creation/joining primarily

### Gem History Derivation

Gem history is **not stored as a separate ledger**. It is derived from attempts at query time.

**Source:** `TwoCupsApp/src/screens/GemHistoryScreen.tsx:85-152`

The `processAttemptsToGemEntries()` function:
1. Queries all attempts where user is `byPlayerId` or `forPlayerId`
2. For each attempt, creates history entries:
   - If `byPlayerId === uid`: +1 "logged_attempt"
   - If `fulfilledRequestId` exists: +2 "request_fulfilled"
   - If `acknowledged && byPlayerId === uid`: +3 "acknowledged_given"
   - If `acknowledged && forPlayerId === uid`: +3 "acknowledged_received"

---

## UI Rendering Model (Cups/Visuals)

### Cup Visualization

**Source:** `TwoCupsApp/src/components/cups/CupVisualization.tsx`

**How cup fullness is determined:**
- Level is passed as prop (0-100)
- Level is clamped: `Math.min(100, Math.max(0, level))`
- Fill height is animated using React Native Animated
- Fill percentage shown as text overlay in center of cup

**Data source for level:**
- `usePlayerData()` hook subscribes to Firestore in real-time
- `myPlayer.cupLevel` and `partnerPlayer.cupLevel` from `/couples/{coupleId}/players/{uid}`
- `collectiveCupLevel` from `/couples/{coupleId}`

**Source:** `TwoCupsApp/src/hooks/usePlayerData.ts:54-74`

**Colors:**
- Individual cups: `colors.cupFilled` (line 26)
- Collective cup: `colors.primary` (line 26)

**Sizes:**
- Large: 120px height, 80px width
- Small: 80px height, 60px width

### Home Screen Display

**Source:** `TwoCupsApp/src/screens/HomeScreen.tsx`

The home screen shows:
1. Two small cups side-by-side (partner cups) - lines 98-109
2. One large collective cup - lines 138-143
3. Total gems (myGemCount + partnerGemCount) - line 64, displayed lines 151-160

---

## Edge Cases & Guards

### Implemented Guards

| Guard | Implementation | Location |
|-------|---------------|----------|
| **Daily attempt limit** | 20 attempts/day | `actions.ts:27`, `actions.ts:221-224` |
| **Active request limit** | 5 active requests | `actions.ts:28`, `actions.ts:417-419` |
| **No self-attempts** | `forPlayerId !== uid` check | `actions.ts:216-218` |
| **No duplicate acknowledgment** | `acknowledged === false` check | `actions.ts:334-336` |
| **Only recipient can acknowledge** | `forPlayerId === uid` check | `actions.ts:329-331` |
| **Only creator can cancel request** | `byPlayerId === uid` check | `actions.ts:498-500` |
| **Cup overflow handling** | Reset to `level - 100` when >= 100 | `actions.ts:351-352` |
| **Input sanitization** | `validateActionServer()`, `validateDescriptionServer()` | `actions.ts:212-213` |

### Idempotency

**Acknowledgment:** Protected by `acknowledged === false` check. Attempting to acknowledge twice throws "Attempt already acknowledged".

**Logging:** No idempotency - same action can be logged multiple times (intentional).

**Request fulfillment:** First match wins. Only one request is marked fulfilled per attempt.

### Offline Behavior

**Not found.** No offline queue, optimistic updates without rollback, or sync conflict resolution detected.

### Race Conditions

**Potential issues:**
- Acknowledgment uses batch write but reads before write - theoretically two simultaneous acks could both pass the `acknowledged === false` check
- Cup level read-then-write could cause lost updates under heavy concurrent acknowledgments
- No Firestore transactions found for critical paths

### Time-Based Logic

| Feature | Status |
|---------|--------|
| Aging/decay | Not implemented |
| Rollover/resets | Not implemented |
| Streak tracking | Not implemented |
| Time-based bonuses | Not implemented |

**Time-based queries used:**
- Daily attempt count: queries `createdAt >= startOfToday`
- Weekly gem stats: queries `createdAt >= startOfWeek`

---

## Open Questions

1. **Why duplicate logic in client and Cloud Functions?** The `functions/src/index.ts` mirrors `actions.ts` - unclear if both are used or one is deprecated.

2. **What triggers milestone celebrations?** The `achievedMilestones` array exists but the milestone thresholds and celebration logic in `MilestoneCelebrationContext.tsx` were not fully traced.

3. **Is there dead code?** The Cloud Functions may be unused if all writes go through client SDK.

4. **Request fulfillment matching:** Case-insensitive exact match only (`reqData.action.trim().toLowerCase() === normalizedAction`). Partial matches or fuzzy matching not implemented.

---

## File References

| File | Purpose |
|------|---------|
| `TwoCupsApp/src/services/api/actions.ts` | Core economy logic (client) |
| `functions/src/index.ts` | Cloud Functions (server) |
| `TwoCupsApp/src/types/index.ts` | TypeScript interfaces |
| `firestore.rules` | Security rules |
| `TwoCupsApp/src/screens/HomeScreen.tsx` | Dashboard UI |
| `TwoCupsApp/src/screens/LogAttemptScreen.tsx` | Log attempt UI |
| `TwoCupsApp/src/screens/AcknowledgeScreen.tsx` | Acknowledge UI |
| `TwoCupsApp/src/screens/MakeRequestScreen.tsx` | Request management UI |
| `TwoCupsApp/src/screens/GemHistoryScreen.tsx` | Gem history UI |
| `TwoCupsApp/src/components/cups/CupVisualization.tsx` | Cup rendering |
| `TwoCupsApp/src/hooks/usePlayerData.ts` | Player data subscription |
