import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { Player } from '../types';

interface PlayerWithId extends Player {
  odI: string;
  achievedMilestones: number[];
}

interface UsePlayerDataResult {
  myPlayer: PlayerWithId | null;
  partnerPlayer: PlayerWithId | null;
  partnerName: string;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePlayerData(): UsePlayerDataResult {
  const { user, userData, coupleData } = useAuth();
  const [myPlayer, setMyPlayer] = useState<PlayerWithId | null>(null);
  const [partnerPlayer, setPartnerPlayer] = useState<PlayerWithId | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Partner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];

  const refresh = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!coupleId || !myUid || partnerIds.length === 0) {
      setLoading(false);
      return;
    }

    const partnerId = partnerIds.find(id => id !== myUid) ?? null;

    // Listen to my player document
    const myPlayerRef = doc(db, 'couples', coupleId, 'players', myUid);
    const unsubscribeMy = onSnapshot(
      myPlayerRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMyPlayer({
            odI: myUid,
            cupLevel: data?.cupLevel ?? 0,
            gemCount: data?.gemCount ?? 0,
            joinedAt: data?.joinedAt?.toDate() ?? new Date(),
            achievedMilestones: data?.achievedMilestones ?? [],
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching my player:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Listen to partner player document
    let unsubscribePartner: (() => void) | null = null;
    let unsubscribePartnerUser: (() => void) | null = null;
    
    if (partnerId) {
      const partnerPlayerRef = doc(db, 'couples', coupleId, 'players', partnerId);
      unsubscribePartner = onSnapshot(
        partnerPlayerRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPartnerPlayer({
              odI: partnerId,
              cupLevel: data?.cupLevel ?? 0,
              gemCount: data?.gemCount ?? 0,
              joinedAt: data?.joinedAt?.toDate() ?? new Date(),
              achievedMilestones: data?.achievedMilestones ?? [],
            });
          }
        },
        (err) => {
          console.error('Error fetching partner player:', err);
        }
      );

      // Get partner's display name from users collection
      const partnerUserRef = doc(db, 'users', partnerId);
      unsubscribePartnerUser = onSnapshot(partnerUserRef, (snapshot) => {
        if (snapshot.exists()) {
          setPartnerName(snapshot.data()?.displayName || 'Partner');
        }
      });
    }

    return () => {
      unsubscribeMy();
      if (unsubscribePartner) unsubscribePartner();
      if (unsubscribePartnerUser) unsubscribePartnerUser();
    };
  }, [coupleId, myUid, partnerIds.join(','), refreshKey]);

  return { myPlayer, partnerPlayer, partnerName, loading, error, refresh };
}
