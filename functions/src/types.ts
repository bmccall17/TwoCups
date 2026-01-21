import { Timestamp } from "firebase-admin/firestore";

// ============================================
// GEM ECONOMY TYPES
// ============================================

// Gem types with their associated values
export type GemType = "emerald" | "sapphire" | "ruby" | "diamond";

// Gem states in lifecycle
export type GemState = "solid" | "liquid" | "coal";

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

// Gem economy constants
export const GEM_VALUES = {
  emerald: 1,   // Attempt logged
  sapphire: 2,  // Request fulfilled
  ruby: 3,      // Acknowledgment (both players)
  diamond: 5,   // Milestones/overflow
} as const;

export const COAL_THRESHOLD_DAYS = 14;

// ============================================
// USER & COUPLE TYPES
// ============================================

// User document in /users/{uid}
export interface User {
  displayName: string;
  initial: string; // single character
  activeCoupleId: string | null;
  createdAt: Timestamp;
}

// Couple document in /couples/{coupleId}
export interface Couple {
  partnerIds: string[]; // length must be ≤ 2
  status: "pending" | "active";
  inviteCode: string;
  pointsPerAcknowledgment: number; // default: 5
  collectiveCupLevel: number; // 0–100
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
  // Gem economy fields
  anniversaryDate?: Timestamp;
  collectiveLiquidBreakdown?: GemBreakdown;
}

// Player document in /couples/{coupleId}/players/{uid}
export interface Player {
  cupLevel: number; // 0–100
  gemCount: number; // KEEP for backward compat
  joinedAt: Timestamp;
  achievedMilestones?: number[]; // Milestones the player has achieved
  // Gem economy fields
  gemBreakdown?: GemBreakdown;
  liquidBreakdown?: GemBreakdown;
}

// Attempt document in /couples/{coupleId}/attempts/{attemptId}
export interface Attempt {
  byPlayerId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  createdAt: Timestamp;
  acknowledged: boolean;
  acknowledgedAt?: Timestamp;
  fulfilledRequestId?: string;
  // Gem economy fields
  gemType?: GemType;
  gemState?: GemState;
  coalAt?: Timestamp;
}

// Request document in /couples/{coupleId}/requests/{requestId}
export interface Request {
  byPlayerId: string;
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
  status: "active" | "fulfilled" | "canceled";
  createdAt: Timestamp;
  fulfilledAt?: Timestamp;
  fulfilledByAttemptId?: string;
}

// Suggestion document in /couples/{coupleId}/suggestions/{suggestionId}
export interface Suggestion {
  byPlayerId: string; // Who created the suggestion
  action: string;
  description?: string;
  category?: string;
  createdAt: Timestamp;
}

// InviteCode document in /inviteCodes/{inviteCode}
export interface InviteCode {
  coupleId: string;
  creatorId: string;
  status: "active" | "used" | "expired";
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// Function request/response types
export interface CreateCoupleRequest {
  displayName: string;
  initial: string;
}

export interface CreateCoupleResponse {
  coupleId: string;
  inviteCode: string;
}

export interface JoinCoupleRequest {
  inviteCode: string;
  displayName: string;
  initial: string;
}

export interface JoinCoupleResponse {
  coupleId: string;
  partnerId: string;
  partnerName: string;
}

export interface LogAttemptRequest {
  forPlayerId: string;
  action: string;
  description?: string;
  category?: string;
}

export interface LogAttemptResponse {
  attemptId: string;
  gemsAwarded: number;
  fulfilledRequestId?: string;
  gemType?: GemType;
}

export interface AcknowledgeAttemptRequest {
  attemptId: string;
}

export interface AcknowledgeAttemptResponse {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
  collectiveCupOverflow: boolean;
  wasCoal?: boolean;
  diamondAwarded?: boolean;
}
