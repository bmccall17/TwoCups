import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
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
import { doc, onSnapshot } from 'firebase/firestore';
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
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Listen for user document changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeUser = onSnapshot(
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
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user document:', error);
            setLoading(false);
          }
        );

        return () => unsubscribeUser();
      } else {
        setUserData(null);
        setCoupleData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
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
