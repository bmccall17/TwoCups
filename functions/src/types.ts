import { Timestamp } from "firebase-admin/firestore";

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
}

// Player document in /couples/{coupleId}/players/{uid}
export interface Player {
  cupLevel: number; // 0–100
  gemCount: number;
  joinedAt: Timestamp;
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
  forPlayerId: string;
  createdByPlayerId: string;
  action: string;
  category?: string;
  isRecurring: boolean;
  usageCount: number;
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
}

export interface AcknowledgeAttemptRequest {
  attemptId: string;
}

export interface AcknowledgeAttemptResponse {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
}
