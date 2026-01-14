import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface PendingWrite {
  id: string;
  type: 'attempt' | 'request' | 'acknowledgment' | 'suggestion';
  action: string;
  createdAt: Date;
}

interface NetworkContextType {
  isOnline: boolean;
  pendingWritesCount: number;
  pendingWrites: PendingWrite[];
  hasPendingWrites: boolean;
  lastSyncTime: Date | null;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function NetworkProvider({ children }: Props) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingWritesCount, setPendingWritesCount] = useState(0);
  const [pendingWrites, setPendingWrites] = useState<PendingWrite[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user, userData } = useAuth();
  const { showSuccess } = useToast();
  const wasOfflineRef = useRef(false);
  const hadPendingWritesRef = useRef(false);
  const coupleId = userData?.activeCoupleId;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncTime(new Date());
      if (wasOfflineRef.current) {
        showSuccess('Back online!');
      }
      wasOfflineRef.current = false;
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !coupleId) {
      setPendingWritesCount(0);
      setPendingWrites([]);
      return;
    }

    const attemptsQuery = query(
      collection(db, 'couples', coupleId, 'attempts'),
      where('byPlayerId', '==', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      attemptsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const pending: PendingWrite[] = [];
        
        snapshot.docChanges().forEach((change) => {
          if (change.doc.metadata.hasPendingWrites) {
            const data = change.doc.data();
            pending.push({
              id: change.doc.id,
              type: 'attempt',
              action: data.action || 'Unknown action',
              createdAt: data.createdAt?.toDate() || new Date()
            });
          }
        });

        let totalPending = 0;
        snapshot.docs.forEach((doc) => {
          if (doc.metadata.hasPendingWrites) {
            totalPending++;
          }
        });

        setPendingWritesCount(totalPending);
        
        if (pending.length > 0) {
          setPendingWrites((prev) => {
            const newWrites = [...prev];
            pending.forEach((p) => {
              if (!newWrites.find((w) => w.id === p.id)) {
                newWrites.push(p);
              }
            });
            return newWrites.slice(-10);
          });
        }

        if (totalPending === 0 && snapshot.docs.length > 0) {
          if (hadPendingWritesRef.current) {
            showSuccess('All changes synced!');
          }
          hadPendingWritesRef.current = false;
          setPendingWrites([]);
          if (!snapshot.metadata.fromCache) {
            setLastSyncTime(new Date());
          }
        } else if (totalPending > 0) {
          hadPendingWritesRef.current = true;
        }
      }
    );

    return () => unsubscribe();
  }, [user, coupleId, showSuccess]);

  const value: NetworkContextType = {
    isOnline,
    pendingWritesCount,
    pendingWrites,
    hasPendingWrites: pendingWritesCount > 0,
    lastSyncTime
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}
