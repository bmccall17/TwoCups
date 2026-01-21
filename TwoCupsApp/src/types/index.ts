// ============================================
// GEM ECONOMY TYPES
// ============================================

// Gem types with their associated values
export type GemType = 'emerald' | 'sapphire' | 'ruby' | 'diamond';

// Gem states in lifecycle
export type GemState = 'solid' | 'liquid' | 'coal';

// Breakdown of gems by type
export interface GemBreakdown {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
}

// Empty gem breakdown for initialization
export const EMPTY_GEM_BREAKDOWN: GemBreakdown = {
  emerald: 0,
  sapphire: 0,
  ruby: 0,
  diamond: 0,
};

// ============================================
// USER & COUPLE TYPES
// ============================================

// User document in /users/{uid}
export interface User {
  username: string;
  initial: string;
  activeCoupleId: string | null;
  createdAt: Date;
}

// Username lookup document in /usernames/{username}
export interface UsernameDoc {
  uid: string;
  email: string;
  createdAt: Date;
}

// Couple document in /couples/{coupleId}
export interface Couple {
  partnerIds: string[];
  status: 'pending' | 'active';
  inviteCode: string;
  pointsPerAcknowledgment: number;
  collectiveCupLevel: number;
  createdAt: Date;
  lastActivityAt: Date;
  // Gem economy fields
  anniversaryDate?: Date;           // For anniversary diamond trigger
  collectiveLiquidBreakdown?: GemBreakdown; // Gems that filled collective cup
}

// Player document in /couples/{coupleId}/players/{uid}
export interface Player {
  cupLevel: number;
  gemCount: number;               // KEEP for backward compat (total gems earned)
  joinedAt: Date;
  achievedMilestones?: number[];
  // Gem economy fields - NEW
  gemBreakdown?: GemBreakdown;    // All gems earned by type (solid + liquid)
  liquidBreakdown?: GemBreakdown; // Acknowledged gems that filled cups
}

// Attempt document in /couples/{coupleId}/attempts/{attemptId}
export interface Attempt {
  id: string;
  byPlayerId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  fulfilledRequestId?: string;
  // Gem economy fields - NEW
  gemType?: GemType;              // Which gem was awarded (emerald or sapphire)
  gemState?: GemState;            // solid until acknowledged, then liquid (or coal if ignored)
  coalAt?: Date;                  // When it became coal (if unacked for X days)
}

// Request document in /couples/{coupleId}/requests/{requestId}
export interface Request {
  id: string;
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

// Suggestion document in /couples/{coupleId}/suggestions/{suggestionId}
export interface Suggestion {
  id: string;
  byPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  createdAt: Date;
}

// Function response types
export interface CreateCoupleResponse {
  coupleId: string;
  inviteCode: string;
}

export interface JoinCoupleResponse {
  coupleId: string;
  partnerId: string;
  partnerName: string;
}

export interface LogAttemptResponse {
  attemptId: string;
  gemsAwarded: number;
  fulfilledRequestId?: string;
  // Gem economy fields - NEW
  gemType?: GemType;              // Which gem type was awarded
}

// Diamond award information
export interface DiamondAward {
  type: 'cup_overflow' | 'collective_overflow' | 'mutual_ack' | 'weekly_reflection' | 'anniversary';
  recipient: 'player' | 'partner' | 'both' | 'collective';
  amount: number;
}

export interface AcknowledgeAttemptResponse {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
  collectiveCupOverflow: boolean;
  // Gem economy fields - NEW
  wasCoal?: boolean;              // True if acknowledged a coal-state attempt
  diamondAwards?: DiamondAward[]; // Any diamonds awarded during this acknowledgment
}
