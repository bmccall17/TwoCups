// User document in /users/{uid}
export interface User {
  displayName: string;
  initial: string;
  activeCoupleId: string | null;
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
}

// Player document in /couples/{coupleId}/players/{uid}
export interface Player {
  cupLevel: number;
  gemCount: number;
  joinedAt: Date;
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
}

export interface AcknowledgeAttemptResponse {
  success: boolean;
  gemsAwarded: number;
  cupOverflow: boolean;
}
