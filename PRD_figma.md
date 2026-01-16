# The Two of Cups - Product Requirements Document

## Executive Summary

**The Two of Cups** is a gamified relationship maintenance app where two people track and acknowledge ways they fill each other's emotional cups. The app rewards mutual recognition (ruby = 3 gem count), making requests (sapphire ) solo effort (sapphires 1-2 gems), creating incentives for communication and acknowledgment. Core features include request systems, recurring suggestion management, individual + collective cup visualizations, and anti-gaming mechanics.

---

## Core Game Mechanics

### 1. Gem Economy

**Earning Gems:**
- **Log a normal attempt**: +1 gem (immediate)
- **Log attempt that fulfills partner's request**: +2 gems (immediate)
- **Partner acknowledges your attempt**: +3 gems to each player + 3 to collective cup

**Key Principle:** Mutual recognition (acknowledge) creates 3x more value than solo effort, incentivizing communication.

**Anti-Gaming Mechanics:**
- Daily attempt limit: 20 per player per day
- Acknowledgment requires the receiving player to actively confirm
- No self-acknowledgment possible
- Request fulfillment requires exact text match (case-insensitive)

### 2. Cup Filling System

**Individual Cups:**
- Each player has their own cup (0-100 capacity)
- Fills when partner logs attempts for them
- Each acknowledged attempt adds progress based on configured increment
- Visual overflow celebration when reaching 100

**Collective Cup:**
- Shared relationship progress (0-100 capacity)
- Only fills when attempts are acknowledged (+3 per acknowledgment)
- Represents mutual effort and recognition
- Visual celebration on overflow

**Cup Configuration:**
- Points per acknowledgment (default: 5)
- Adjustable by players during setup

### 3. Request System

**Creating Requests:**
- Player can request specific actions from partner
- Fields: action text, category, optional description
- Requests appear prominently in partner's Log Attempt screen
- Visual priority styling (gradient borders, special icons)

**Request Fulfillment:**
- Auto-detected when partner logs matching attempt (case-insensitive text match)
- Automatically marks request as fulfilled
- Awards 2 gems instead of 1
- Special toast notification with celebration emoji
- Fulfilled requests remain visible in history with fulfilled status

**Request States:**
- Active (unfulfilled)
- Fulfilled (linked to specific attempt)
- No expiration (requests persist until fulfilled)

### 4. Suggestion System

**Creating Suggestions:**
- Each player maintains suggestions for "ways to fill my cup"
- Fields: action text, category
- Can be recurring (partner can use multiple times)
- Organized by 9 love language categories

**Categories:**
1. Words of Affirmation
2. Acts of Service
3. Quality Time
4. Physical Touch
5. Gifts
6. Support & Encouragement
7. Listening & Presence
8. Shared Activities
9. Surprises & Thoughtfulness

**Using Suggestions:**
- Partner sees these when logging attempts
- Can filter by category
- Selecting a suggestion auto-fills the attempt form
- Same suggestion can be used repeatedly
- Helps guide partner's actions

### 5. Attempt Logging

**Attempt Structure:**
- Action text (required) - selected from suggestions or custom
- Description (optional but encouraged) - adds context
- Category (auto-filled from suggestion or manual)
- Timestamp
- Player who logged it (byPlayer)
- Player it's for (forPlayer)
- Acknowledgment status
- Request fulfillment link (if applicable)

**Logging Flow:**
1. Player navigates to Log Attempt
2. Sees partner's active requests at top (priority display)
3. Can filter suggestions by category
4. Selects suggestion or enters custom action
5. Adds optional description
6. Submits → earns 1-2 gems immediately
7. If matches active request → auto-fulfills + 2 gems + special notification

### 6. Acknowledgment Flow

**Review Pending Attempts:**
- Player sees attempts logged by partner for them
- Can filter by pending/acknowledged
- Each attempt shows: action, description, timestamp, request link

**Acknowledging:**
- Player clicks to acknowledge
- Awards 3 gems to each player
- Awards 3 points to collective cup
- Fills individual cup by configured amount
- Visual feedback with gem animation
- Cannot un-acknowledge

---

## Data Models

### Player
```typescript
interface Player {
  id: string;              // Unique identifier
  name: string;            // Display name
  cupLevel: number;        // 0-100, resets on overflow
  gemCount: number;        // Total gems earned
}
```

### GameState
```typescript
interface GameState {
  id: string;                    // Game session ID
  players: [Player, Player];     // Exactly 2 players
  collectiveCup: number;         // 0-100, shared progress
  pointsPerAcknowledgment: number; // Cup fill increment (default: 5)
  createdAt: string;             // ISO timestamp
  lastActivityAt: string;        // ISO timestamp
}
```

### Request
```typescript
interface Request {
  id: string;
  byPlayerId: string;           // Who is making the request
  forPlayerId: string;          // Who should fulfill it
  action: string;               // What they're requesting
  category: string;             // Love language category
  description?: string;         // Optional context
  createdAt: string;            // ISO timestamp
  fulfilledByAttemptId?: string; // Links to attempt when fulfilled
  fulfilledAt?: string;         // ISO timestamp of fulfillment
}
```

### Suggestion
```typescript
interface Suggestion {
  id: string;
  forPlayerId: string;          // Who this suggestion is for
  createdByPlayerId: string;    // Who created it (usually same as forPlayerId)
  action: string;               // The suggested action
  category: string;             // Love language category
  isRecurring: boolean;         // Can be used multiple times (always true for now)
  createdAt: string;            // ISO timestamp
}
```

### Attempt
```typescript
interface Attempt {
  id: string;
  byPlayerId: string;           // Who logged this attempt
  forPlayerId: string;          // Whose cup they're filling
  action: string;               // What they did
  description?: string;         // Optional details
  category?: string;            // Love language category
  timestamp: string;            // ISO timestamp
  acknowledged: boolean;        // Has receiver acknowledged?
  acknowledgedAt?: string;      // ISO timestamp of acknowledgment
  fulfilledRequestId?: string;  // Links to request if applicable
}
```

---

## Feature Requirements

### Phase 1: Authentication & Game Setup (Foundation)

**F1.1 - User Authentication**
- Real authentication system (follow claude's plan)
- Email/password signup
- Session management
- Secure token handling

**F1.2 - Game Initialization**
- Player 1 creates game session
- Generates unique invite code/link
- Player 2 joins via invite
- Both players enter names
- Configure cup settings (points per acknowledgment)
- Validation: exactly 2 players per game

**F1.3 - Session Management**
- Persistent game state across sessions
- Real-time sync between players
- Last activity tracking
- Handle offline/online states
- Reconnection logic

### Phase 2: Core Game Loop (MVP)

**F2.1 - Dashboard**
- Display both individual cups with fill levels
- Display collective cup
- Show gem counts for both players
- Quick stats: pending attempts, active requests
- Navigation to all features
- Real-time updates when partner takes action

**F2.2 - Log Attempt**
- Display partner's active requests prominently
- Category filter for suggestions
- Select from partner's suggestions
- Enter custom action + optional description
- Daily limit enforcement (20)
- Request auto-fulfillment detection
- Immediate gem reward (1-2 gems)
- Success feedback with animations

**F2.3 - Acknowledge Attempts**
- View all pending attempts for current player
- Filter: all / pending / acknowledged
- Display attempt details with context
- One-tap acknowledgment
- Gem + cup rewards on acknowledge
- Visual confirmation
- Sort by timestamp (newest first)

**F2.4 - Manage My Suggestions**
- CRUD operations for own suggestions
- Categorize by love language
- View organized by category
- Indicate usage count (how many times partner used it)
- Bulk operations (delete multiple)

**F2.5 - Make Request**
- Create new request for partner
- Select category
- Enter action text + optional description
- View own active requests
- View fulfilled requests with linked attempts
- Cancel unfulfilled requests
- Request limit: 5 active per player

### Phase 3: Enhanced Experience

**F3.1 - Cup Overflow Celebrations**
- Animated gem burst when cup reaches 100
- Confetti or particle effects
- Sound effect (optional, user-toggleable)
- Cup resets to 0 after celebration
- Achievement notification

**F3.2 - History & Analytics**
- View all attempts (timeline view)
- Filter by player, category, date range
- Acknowledgment rate statistics
- Most used suggestions
- Request fulfillment rate
- Gem earning trends
- Weekly/monthly summaries

**F3.3 - Notifications**
- Push notifications for:
  - Partner logged attempt for you
  - Partner acknowledged your attempt
  - Partner made new request
  - Partner fulfilled your request
  - Cup overflow celebration
- In-app notification center
- Notification preferences

**F3.4 - Customization**
- Upload custom avatars
- Choose cup design/theme
- Customize gem appearance
- Dark/light theme toggle
- Adjust cup capacity (50/100/150)
- Adjust points per acknowledgment

### Phase 4: Social & Retention

**F4.1 - Streaks & Achievements**
- Daily acknowledgment streaks
- Request fulfillment streaks
- Total gems milestones
- Category diversity achievements
- Unlock special cup designs/themes

**F4.2 - Insights & Prompts**
- Weekly relationship insights
- Suggestion prompts based on unused categories
- Encouragement when acknowledgment rate drops
- Celebration messages on milestones

**F4.3 - Multiple Game Support**
- Users can participate in multiple games
- Switch between relationships
- Separate gem counts per game
- Game archives (view past relationships)

---

## Design Considerations

### Navigation Patterns (IMPORTANT)

**Bottom Tab Navigator with Hidden Screens:**
- When using React Navigation's Bottom Tab Navigator with hidden screens that should keep the tab bar visible but not appear as tabs
- **MUST** use BOTH `tabBarButton: () => null` AND `tabBarItemStyle: { display: 'none' }` on each hidden screen
- Using only `tabBarButton: () => null` still creates invisible tab slots that take up space in the flex layout
- **DO NOT** use `tabBarItemStyle: { flex: 1 }` in global `screenOptions` - this makes the problem worse

**Example (CORRECT):**
```tsx
<MainTab.Navigator
  screenOptions={{
    tabBarLabelStyle: { fontSize: 10 },
    // NO tabBarItemStyle in screenOptions
  }}
>
  <MainTab.Screen name="Home" {...} />
  <MainTab.Screen
    name="HiddenScreen"
    options={{
      tabBarButton: () => null,
      tabBarItemStyle: { display: 'none' },  // REQUIRED to remove from layout
    }}
  />
</MainTab.Navigator>
```

**Reference Issue:** Fixed 2026-01-16 - Bottom tab bar had 3 invisible slots taking width

---

## Technical Architecture

### Recommended Stack

**Frontend:**
- React 18+ (already in use)
- TypeScript for type safety
- Tailwind CSS v4 (already in use)
- Motion/React for animations
- Recharts for analytics visualizations
- Lucide React for icons

**Backend & Database:**
- **Supabase** (recommended for full stack)
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Built-in authentication
  - Storage for avatars
  - Edge functions for complex logic

**Alternative:** Firebase (if preferred)

**State Management:**
- React Context + Hooks for global state
- React Query for server state (if not using Supabase client)
- Local storage for offline support

**Deployment:**
- Vercel or Netlify for frontend
- Supabase hosted or self-hosted

### Database Schema (Supabase/PostgreSQL)

```sql
-- Users table (managed by Supabase Auth)
-- We'll use auth.users

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code TEXT UNIQUE NOT NULL,
  points_per_acknowledgment INTEGER DEFAULT 5,
  collective_cup INTEGER DEFAULT 0 CHECK (collective_cup >= 0 AND collective_cup <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'archived'))
);

-- Game players (junction table)
CREATE TABLE game_players (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_number INTEGER CHECK (player_number IN (1, 2)),
  cup_level INTEGER DEFAULT 0 CHECK (cup_level >= 0 AND cup_level <= 100),
  gem_count INTEGER DEFAULT 0 CHECK (gem_count >= 0),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id),
  UNIQUE (game_id, player_number)
);

-- Suggestions table
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Requests table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_by_attempt_id UUID,
  fulfilled_at TIMESTAMPTZ
);

-- Attempts table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  category TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  fulfilled_request_id UUID REFERENCES requests(id) ON DELETE SET NULL
);

-- Add foreign key constraint after attempts table exists
ALTER TABLE requests 
  ADD CONSTRAINT fk_fulfilled_attempt 
  FOREIGN KEY (fulfilled_by_attempt_id) 
  REFERENCES attempts(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_attempts_game_for_user ON attempts(game_id, for_user_id, acknowledged);
CREATE INDEX idx_attempts_timestamp ON attempts(timestamp DESC);
CREATE INDEX idx_requests_game_active ON requests(game_id, for_user_id) WHERE fulfilled_by_attempt_id IS NULL;
CREATE INDEX idx_suggestions_game_for_user ON suggestions(game_id, for_user_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Games: Players can only see games they're part of
CREATE POLICY "Players can view their games"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  );

-- Game players: Players can view players in their games
CREATE POLICY "Players can view game participants"
  ON game_players FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

-- Suggestions: Players can view suggestions in their games
CREATE POLICY "Players can view suggestions in their games"
  ON suggestions FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update own suggestions"
  ON suggestions FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Players can delete own suggestions"
  ON suggestions FOR DELETE
  USING (created_by_user_id = auth.uid());

-- Requests: Similar patterns
CREATE POLICY "Players can view requests in their games"
  ON requests FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create requests"
  ON requests FOR INSERT
  WITH CHECK (
    by_user_id = auth.uid()
    AND game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update requests in their games"
  ON requests FOR UPDATE
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

-- Attempts: Similar patterns
CREATE POLICY "Players can view attempts in their games"
  ON attempts FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create attempts"
  ON attempts FOR INSERT
  WITH CHECK (
    by_user_id = auth.uid()
    AND game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update attempts in their games"
  ON attempts FOR UPDATE
  USING (
    game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );
```

### Real-Time Subscriptions

```typescript
// Subscribe to attempts for current game
const attemptsSubscription = supabase
  .channel('attempts-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'attempts',
      filter: `game_id=eq.${gameId}`
    },
    (payload) => {
      // Update local state
    }
  )
  .subscribe();

// Subscribe to game state changes (cups, gems)
const gameSubscription = supabase
  .channel('game-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_players',
      filter: `game_id=eq.${gameId}`
    },
    (payload) => {
      // Update local state
    }
  )
  .subscribe();
```

### API / Edge Functions

**Key Edge Functions to Implement:**

1. **`log-attempt`**
   - Validates daily limit (20 attempts)
   - Creates attempt record
   - Checks for request fulfillment (case-insensitive match)
   - Updates request if fulfilled
   - Awards gems (1 or 2)
   - Updates game activity timestamp
   - Returns: attempt object + gems awarded

2. **`acknowledge-attempt`**
   - Validates attempt exists and is unacknowledged
   - Validates user is the recipient
   - Updates attempt as acknowledged
   - Awards 3 gems to both players
   - Adds 3 to collective cup
   - Adds configured points to individual cup
   - Checks for cup overflow (→ celebration)
   - Returns: updated game state

3. **`create-game`**
   - Generates unique invite code
   - Creates game record
   - Adds creator as player 1
   - Returns: game ID + invite code

4. **`join-game`**
   - Validates invite code
   - Checks game has only 1 player
   - Adds user as player 2
   - Updates game status to 'active'
   - Returns: game object

5. **`create-request`**
   - Validates active request limit (max 5 per player)
   - Creates request record
   - Returns: request object

6. **`create-suggestion`**
   - Creates suggestion record
   - Returns: suggestion object

---

## Business Logic Reference

### Daily Attempt Limit

```typescript
async function canLogAttempt(userId: string, gameId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('by_user_id', userId)
    .gte('timestamp', today.toISOString());
  
  return (count || 0) < 20;
}
```

### Request Fulfillment Detection

```typescript
async function checkRequestFulfillment(
  gameId: string,
  forUserId: string,
  byUserId: string,
  actionText: string
): Promise<string | null> {
  const { data: requests } = await supabase
    .from('requests')
    .select('*')
    .eq('game_id', gameId)
    .eq('by_user_id', forUserId)
    .eq('for_user_id', byUserId)
    .is('fulfilled_by_attempt_id', null);
  
  const match = requests?.find(
    r => r.action.toLowerCase().trim() === actionText.toLowerCase().trim()
  );
  
  return match?.id || null;
}
```

### Acknowledgment Rewards

```typescript
async function acknowledgeAttempt(attemptId: string, gameId: string) {
  // 1. Update attempt
  await supabase
    .from('attempts')
    .update({ 
      acknowledged: true, 
      acknowledged_at: new Date().toISOString() 
    })
    .eq('id', attemptId);
  
  // 2. Get attempt details
  const { data: attempt } = await supabase
    .from('attempts')
    .select('by_user_id, for_user_id')
    .eq('id', attemptId)
    .single();
  
  // 3. Award gems to both players (+3 each)
  await supabase.rpc('add_gems', {
    p_game_id: gameId,
    p_user_id: attempt.by_user_id,
    p_gems: 3
  });
  
  await supabase.rpc('add_gems', {
    p_game_id: gameId,
    p_user_id: attempt.for_user_id,
    p_gems: 3
  });
  
  // 4. Get points per acknowledgment setting
  const { data: game } = await supabase
    .from('games')
    .select('points_per_acknowledgment')
    .eq('id', gameId)
    .single();
  
  const points = game?.points_per_acknowledgment || 5;
  
  // 5. Add to individual cup (with overflow handling)
  await supabase.rpc('add_cup_points', {
    p_game_id: gameId,
    p_user_id: attempt.for_user_id,
    p_points: points
  });
  
  // 6. Add to collective cup (with overflow handling)
  await supabase.rpc('add_collective_cup_points', {
    p_game_id: gameId,
    p_points: 3
  });
}
```

### Database Functions (Supabase)

```sql
-- Add gems with validation
CREATE OR REPLACE FUNCTION add_gems(
  p_game_id UUID,
  p_user_id UUID,
  p_gems INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE game_players
  SET gem_count = gem_count + p_gems
  WHERE game_id = p_game_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add cup points with overflow handling
CREATE OR REPLACE FUNCTION add_cup_points(
  p_game_id UUID,
  p_user_id UUID,
  p_points INTEGER
) RETURNS BOOLEAN AS $$ -- Returns true if overflowed
DECLARE
  new_level INTEGER;
  did_overflow BOOLEAN := FALSE;
BEGIN
  SELECT cup_level + p_points INTO new_level
  FROM game_players
  WHERE game_id = p_game_id AND user_id = p_user_id;
  
  IF new_level >= 100 THEN
    new_level := new_level - 100;
    did_overflow := TRUE;
  END IF;
  
  UPDATE game_players
  SET cup_level = new_level
  WHERE game_id = p_game_id AND user_id = p_user_id;
  
  RETURN did_overflow;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add collective cup points with overflow handling
CREATE OR REPLACE FUNCTION add_collective_cup_points(
  p_game_id UUID,
  p_points INTEGER
) RETURNS BOOLEAN AS $$ -- Returns true if overflowed
DECLARE
  new_level INTEGER;
  did_overflow BOOLEAN := FALSE;
BEGIN
  SELECT collective_cup + p_points INTO new_level
  FROM games
  WHERE id = p_game_id;
  
  IF new_level >= 100 THEN
    new_level := new_level - 100;
    did_overflow := TRUE;
  END IF;
  
  UPDATE games
  SET collective_cup = new_level,
      last_activity_at = NOW()
  WHERE id = p_game_id;
  
  RETURN did_overflow;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Frontend Architecture

### Folder Structure

```
/src
  /components
    /auth
      Login.tsx
      Signup.tsx
      PasswordReset.tsx
    /game
      Dashboard.tsx
      CupVisualization.tsx
      GemCounter.tsx
      CupOverflowCelebration.tsx
    /attempts
      LogAttempt.tsx
      AcknowledgeAttempts.tsx
      AttemptCard.tsx
      AttemptList.tsx
    /requests
      MakeRequest.tsx
      RequestList.tsx
      RequestCard.tsx
    /suggestions
      ManageSuggestions.tsx
      SuggestionForm.tsx
      SuggestionList.tsx
      CategoryFilter.tsx
    /setup
      CreateGame.tsx
      JoinGame.tsx
      GameSetup.tsx
    /shared
      Button.tsx
      Input.tsx
      Modal.tsx
      Toast.tsx
      LoadingSpinner.tsx
  /contexts
    AuthContext.tsx
    GameContext.tsx
  /hooks
    useAuth.ts
    useGame.ts
    useAttempts.ts
    useRequests.ts
    useSuggestions.ts
    useRealtime.ts
  /lib
    supabase.ts
    constants.ts
    utils.ts
  /types
    index.ts
  App.tsx
  main.tsx
  /styles
    globals.css
```

### State Management Strategy

**AuthContext:**
- Current user
- Session management
- Login/logout functions

**GameContext:**
- Current game ID
- Game state (cups, gems, settings)
- Both players' data
- Real-time sync
- CRUD operations

**Component-level state:**
- Form inputs
- UI state (modals, filters)
- Local loading states

### Real-time Strategy

Use Supabase real-time subscriptions for:
- Attempts table changes
- Game_players table changes (cups, gems)
- Requests table changes

Update local context state when changes detected.

---

## Phased Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Authentication, database, and game setup flow

**Tasks:**
1. Set up Supabase project
2. Create database schema with RLS policies
3. Implement authentication UI (login, signup, password reset)
4. Create AuthContext with Supabase integration
5. Build CreateGame flow (generates invite code)
6. Build JoinGame flow (validates invite code)
7. Build GameSetup (both players configure settings)
8. Create GameContext with basic state management

**Deliverables:**
- Users can sign up and log in
- Users can create and join games
- Game state persists in database
- Basic navigation framework

**Files Ready to Use:**
- None (complete rebuild for production)

---

### Phase 2: Core Loop - Suggestions & Logging (Weeks 3-4)
**Goal:** Players can suggest actions and log attempts

**Tasks:**
1. Build ManageSuggestions UI (CRUD for own suggestions)
2. Implement category filter component
3. Create suggestion database operations (hooks)
4. Build LogAttempt UI
   - Display partner's suggestions
   - Category filtering
   - Custom action input
   - Daily limit enforcement
5. Implement `log-attempt` edge function
6. Create gem reward system
7. Add toast notifications
8. Real-time sync for new attempts

**Deliverables:**
- Players can create/edit/delete suggestions for themselves
- Players can log attempts using partner's suggestions
- Gems awarded immediately
- Daily limit enforced

**Files that can be adapted:**
- `/components/ManageSuggestions.tsx` (80% reusable - remove demo data)
- `/components/LogAttempt.tsx` (70% reusable - integrate with Supabase)

---

### Phase 3: Core Loop - Acknowledgments (Week 5)
**Goal:** Players can acknowledge attempts and earn rewards

**Tasks:**
1. Build AcknowledgeAttempts UI
   - List pending attempts
   - Filter controls
   - Acknowledgment button
2. Implement `acknowledge-attempt` edge function
3. Create gem/cup reward logic
4. Build cup visualization components
5. Real-time sync for acknowledgments
6. Add overflow detection (basic)

**Deliverables:**
- Players can see and acknowledge attempts
- Gems and cups update correctly
- Real-time sync works between players
- Basic cup visualization

**Files that can be adapted:**
- `/components/AcknowledgeAttempts.tsx` (75% reusable - integrate with Supabase)

---

### Phase 4: Requests System (Week 6)
**Goal:** Players can make and fulfill requests

**Tasks:**
1. Build MakeRequest UI
2. Implement request CRUD operations
3. Update LogAttempt to show active requests prominently
4. Implement request fulfillment detection logic
5. Add request fulfillment to `log-attempt` function
6. Create 2-gem reward for fulfilled requests
7. Show fulfilled status in request history
8. Enforce active request limit (5 per player)

**Deliverables:**
- Players can create requests
- Requests appear in partner's LogAttempt screen
- Fulfillment auto-detected
- 2 gems awarded for fulfillment

**Files that can be adapted:**
- `/components/MakeRequest.tsx` (80% reusable - integrate with Supabase)

---

### Phase 5: Dashboard & Visualizations (Week 7)
**Goal:** Beautiful, functional dashboard with cup visualizations

**Tasks:**
1. Build Dashboard component
2. Create CupVisualization component (individual cups)
3. Create collective cup visualization
4. Add GemCounter components
5. Build quick stats section
6. Implement real-time updates on dashboard
7. Add navigation to all features
8. Polish animations and transitions

**Deliverables:**
- Beautiful dashboard showing all game state
- Visual cup filling animations
- Responsive design
- Real-time updates

**Files that can be adapted:**
- `/components/Dashboard.tsx` (60% reusable - remove demo data, enhance visuals)
- `/components/CupVisualization.tsx` (if created as separate component - 70% reusable)

---

### Phase 6: Polish & Celebrations (Week 8)
**Goal:** Delightful user experience with celebrations

**Tasks:**
1. Build CupOverflowCelebration component
   - Gem burst animation
   - Confetti effect
   - Sound (optional)
2. Implement overflow detection in acknowledgment flow
3. Add celebration triggers
4. Polish all toast notifications
5. Add loading states everywhere
6. Error handling and validation
7. Mobile responsive testing
8. Performance optimization

**Deliverables:**
- Overflow celebrations work
- Smooth animations throughout
- Error handling
- Mobile-optimized

**Files that can be adapted:**
- General animation patterns from prototype

---

### Phase 7: History & Analytics (Week 9)
**Goal:** Players can review history and see insights

**Tasks:**
1. Build history view (timeline)
2. Add filters (date, category, player, acknowledgment status)
3. Create basic analytics dashboard
   - Total attempts
   - Acknowledgment rate
   - Most used categories
   - Request fulfillment rate
4. Implement date range queries
5. Add pagination for large datasets

**Deliverables:**
- Complete attempt history
- Basic analytics
- Performant queries

**Files that can be adapted:**
- None (new feature)

---

### Phase 8: Notifications (Week 10)
**Goal:** Push notifications for key events

**Tasks:**
1. Set up push notification service (Supabase + FCM or similar)
2. Implement notification triggers:
   - Partner logged attempt
   - Partner acknowledged
   - Partner made request
   - Partner fulfilled request
   - Cup overflow
3. Build notification preferences UI
4. Create in-app notification center
5. Handle notification permissions

**Deliverables:**
- Push notifications work
- In-app notification history
- User can control preferences

**Files that can be adapted:**
- None (new feature)

---

### Phase 9: Extended Features (Weeks 11-12)
**Goal:** Streaks, achievements, customization

**Tasks:**
1. Implement streak tracking
2. Create achievement system
3. Build customization UI (avatars, themes)
4. Add avatar upload to Supabase Storage
5. Implement theme switching
6. Create achievement unlocks

**Deliverables:**
- Streaks tracked and displayed
- Achievements earned and shown
- User customization options

**Files that can be adapted:**
- None (new features)

---

## File Reusability Analysis

### ✅ High Reusability (70%+ reusable with Supabase integration)

**`/components/LogAttempt.tsx`**
- **Reusable:** UI layout, category filtering, suggestion display, form handling
- **Replace:** Demo data with Supabase queries, add real-time subscriptions
- **Effort:** Medium

**`/components/AcknowledgeAttempts.tsx`**
- **Reusable:** UI layout, filtering logic, acknowledgment flow
- **Replace:** Demo data with Supabase queries
- **Effort:** Medium

**`/components/MakeRequest.tsx`**
- **Reusable:** Form UI, validation logic, category selection
- **Replace:** Demo data with Supabase mutations
- **Effort:** Low

**`/components/ManageSuggestions.tsx`**
- **Reusable:** CRUD UI, category organization, filtering
- **Replace:** Demo data with Supabase CRUD operations
- **Effort:** Medium

### ⚠️ Moderate Reusability (40-70% reusable)

**`/components/Dashboard.tsx`**
- **Reusable:** Layout structure, navigation, component composition
- **Replace:** Demo data with real game state, enhance visualizations
- **Effort:** Medium-High

**`/components/CupVisualization.tsx`** (if created separately)
- **Reusable:** Visual design, animation patterns
- **Replace:** Static values with reactive state
- **Effort:** Low-Medium

### ❌ Low Reusability (needs rebuild)

**`/App.tsx`**
- **Reason:** Demo routing, local state management, no auth
- **Approach:** Start fresh with proper routing (React Router), AuthContext, GameContext
- **Effort:** High

**Game state logic in App.tsx**
- **Reason:** Local state, no persistence, no real-time sync
- **Approach:** Move to Supabase with edge functions
- **Effort:** High

---

## Immediate Action Items

### Files Ready for Phase 2+ (after Phase 1 foundation is built)

1. **`/components/ManageSuggestions.tsx`**
   - Remove `demoSuggestions`
   - Replace with `useSuggestions()` hook → Supabase queries
   - Keep all UI/UX patterns

2. **`/components/MakeRequest.tsx`**
   - Remove demo game state
   - Replace with `useRequests()` hook → Supabase queries
   - Keep form validation and UI

3. **`/components/LogAttempt.tsx`**
   - Remove demo suggestions and requests
   - Replace with real-time Supabase queries
   - Keep UI layout and category filtering
   - Add daily limit check (server-side)

4. **`/components/AcknowledgeAttempts.tsx`**
   - Remove demo attempts
   - Replace with Supabase queries + real-time subscription
   - Keep acknowledgment UI patterns

### Files to Build from Scratch (Phase 1 Priority)

1. **`/lib/supabase.ts`** - Supabase client initialization
2. **`/contexts/AuthContext.tsx`** - Authentication state management
3. **`/contexts/GameContext.tsx`** - Game state management
4. **`/components/auth/Login.tsx`** - Login UI
5. **`/components/auth/Signup.tsx`** - Signup UI
6. **`/components/setup/CreateGame.tsx`** - Game creation flow
7. **`/components/setup/JoinGame.tsx`** - Game join flow
8. **Database schema** - SQL migrations for Supabase

---

## Success Metrics

**Engagement:**
- Daily active users (both players logging in)
- Average attempts logged per day per player
- Acknowledgment rate (acknowledged / total attempts)
- Request fulfillment rate

**Retention:**
- 7-day retention
- 30-day retention
- Average session length
- Streak duration

**Quality:**
- Average description length (proxy for thoughtfulness)
- Category diversity per player
- Request usage vs. regular attempts

**Technical:**
- Page load time < 2s
- Real-time sync latency < 500ms
- Error rate < 1%
- Database query performance

---

## Risk Mitigation

**Risk:** Players gaming the system (spam attempts)
- **Mitigation:** Daily limit (20), acknowledgment requirement for rewards

**Risk:** One player stops engaging
- **Mitigation:** Notifications, streak tracking, solo achievements for active player

**Risk:** Real-time sync conflicts
- **Mitigation:** Supabase handles this, optimistic UI updates with rollback

**Risk:** User drops out mid-game
- **Mitigation:** Game archival system, ability to invite new partner

**Risk:** Privacy concerns (relationship data)
- **Mitigation:** Strong RLS policies, clear privacy policy, no PII required

---

## Conclusion

This PRD provides a complete roadmap for building The Two of Cups from prototype to production. The phased approach allows for:

1. **Iterative development** with testable milestones
2. **Gradual complexity** starting with foundation
3. **Reuse of prototype components** where appropriate
4. **Clear database design** with security built-in
5. **Scalable architecture** for future features

**Recommended Next Steps:**
1. Review and approve this PRD
2. Set up Supabase project
3. Begin Phase 1: Authentication & Game Setup
4. After Phase 1, adapt existing components for Phase 2

The existing prototype components (LogAttempt, AcknowledgeAttempts, MakeRequest, ManageSuggestions) provide excellent UI/UX patterns that can be adapted once the foundation (auth, database, real-time sync) is in place.
