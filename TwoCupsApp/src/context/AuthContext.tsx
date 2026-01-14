import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  UserCredential,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import { User, Couple } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  coupleData: Couple | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInAnonymously: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [coupleData, setCoupleData] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for couple document changes when activeCoupleId changes
  useEffect(() => {
    if (!userData?.activeCoupleId) {
      setCoupleData(null);
      return;
    }

    const coupleDocRef = doc(db, 'couples', userData.activeCoupleId);
    const unsubscribeCouple = onSnapshot(
      coupleDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setCoupleData({
            partnerIds: data?.partnerIds ?? [],
            status: data?.status ?? 'pending',
            inviteCode: data?.inviteCode ?? '',
            pointsPerAcknowledgment: data?.pointsPerAcknowledgment ?? 5,
            collectiveCupLevel: data?.collectiveCupLevel ?? 0,
            createdAt: data?.createdAt?.toDate() ?? new Date(),
            lastActivityAt: data?.lastActivityAt?.toDate() ?? new Date(),
          });
        } else {
          setCoupleData(null);
        }
      },
      (error) => {
        console.error('Error listening to couple document:', error);
      }
    );

    return () => unsubscribeCouple();
  }, [userData?.activeCoupleId]);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous user listener
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        // Check if user document exists, create if not (for anonymous auth)
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            // Create minimal user document for new anonymous users
            await setDoc(userDocRef, {
              displayName: '',
              initial: '',
              activeCoupleId: null,
              createdAt: Timestamp.now(),
            });
            console.log('Created user document for:', firebaseUser.uid);
          }
        } catch (error) {
          console.error('Error checking/creating user document:', error);
        }

        // Listen for user document changes
        unsubscribeUser = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setUserData({
                displayName: data?.displayName ?? '',
                initial: data?.initial ?? '',
                activeCoupleId: data?.activeCoupleId ?? null,
                createdAt: data?.createdAt?.toDate() ?? new Date(),
              });
            } else {
              // Document doesn't exist yet - set empty userData (not null)
              // This prevents the loading state from getting stuck
              setUserData({
                displayName: '',
                initial: '',
                activeCoupleId: null,
                createdAt: new Date(),
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user document:', error);
            setLoading(false);
          }
        );
      } else {
        setUserData(null);
        setCoupleData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInAnonymously = async () => {
    return firebaseSignInAnonymously(auth);
  };

  const signOut = async () => {
    return firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        coupleData,
        loading,
        signUp,
        signIn,
        signInAnonymously,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
