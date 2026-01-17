import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';

export function usePendingAcknowledgments() {
  const { user, userData } = useAuth();
  const coupleId = userData?.activeCoupleId;
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId || !user?.uid) {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
    const q = query(
      attemptsRef,
      where('forPlayerId', '==', user.uid),
      where('acknowledged', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingCount(snapshot.size);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching pending acknowledgments:', error);
        setPendingCount(0);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [coupleId, user?.uid]);

  return { pendingCount, loading };
}
