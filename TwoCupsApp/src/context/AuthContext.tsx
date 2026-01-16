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
import { doc, onSnapshot, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import { User, Couple } from '../types';
import { setUserId, setUserAttributes } from '../services/crashlytics';
import { reserveUsername, lookupUsername } from '../services/api/usernames';
import { sanitizeEmail } from '../utils/validation';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  coupleData: Couple | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<UserCredential>;
  signIn: (identifier: string, password: string) => Promise<UserCredential>;
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
    console.log('[AuthContext] Couple effect triggered, activeCoupleId:', userData?.activeCoupleId);
    
    if (!userData?.activeCoupleId) {
      setCoupleData(null);
      return;
    }

    const coupleDocRef = doc(db, 'couples', userData.activeCoupleId);
    console.log('[AuthContext] Setting up couple listener for:', userData.activeCoupleId);
    
    const unsubscribeCouple = onSnapshot(
      coupleDocRef,
      (docSnapshot) => {
        console.log('[AuthContext] Couple snapshot received, exists:', docSnapshot.exists());
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log('[AuthContext] Couple data:', { status: data?.status, partnerIds: data?.partnerIds });
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
          console.log('[AuthContext] Couple document does not exist');
          setCoupleData(null);
        }
      },
      (error) => {
        console.error('[AuthContext] Error listening to couple document:', error);
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
              username: '',
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
            console.log('[AuthContext] User snapshot received, exists:', docSnapshot.exists());
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              console.log('[AuthContext] User data:', { username: data?.username, activeCoupleId: data?.activeCoupleId });
              setUserData({
                username: data?.username ?? '',
                initial: data?.initial ?? '',
                activeCoupleId: data?.activeCoupleId ?? null,
                createdAt: data?.createdAt?.toDate() ?? new Date(),
              });
            } else {
              console.log('[AuthContext] User document does not exist, setting empty userData');
              setUserData({
                username: '',
                initial: '',
                activeCoupleId: null,
                createdAt: new Date(),
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('[AuthContext] Error listening to user document:', error);
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

  // Set Crashlytics user ID when auth state changes
  useEffect(() => {
    const updateCrashlyticsUser = async () => {
      if (user) {
        await setUserId(user.uid);
      } else {
        await setUserId(null);
      }
    };

    void updateCrashlyticsUser();
  }, [user]);

  // Set Crashlytics user attributes when user/couple data changes
  useEffect(() => {
    const updateCrashlyticsAttributes = async () => {
      if (userData) {
        await setUserAttributes({
          username: userData.username || undefined,
          coupleId: userData.activeCoupleId || undefined,
          coupleStatus: coupleData?.status || undefined,
        });
      }
    };

    void updateCrashlyticsAttributes();
  }, [userData, coupleData]);

  const signUp = async (email: string, password: string, username: string) => {
    // First create the Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Then reserve the username (this creates the username doc and updates user doc)
    try {
      await reserveUsername(username, userCredential.user.uid, email);

      // Create the user document with username
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        username: username.toLowerCase(),
        initial: username.charAt(0).toUpperCase(),
        activeCoupleId: null,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      // If username reservation fails, we should probably delete the auth user
      // but for now just rethrow - the user can try again
      console.error('Failed to reserve username:', error);
      throw error;
    }

    return userCredential;
  };

  const signIn = async (identifier: string, password: string) => {
    let email = identifier;

    // If identifier doesn't contain @, it's a username - look up the email
    if (!identifier.includes('@')) {
      const lookedUpEmail = await lookupUsername(identifier);
      if (!lookedUpEmail) {
        throw new Error('Username not found');
      }
      email = lookedUpEmail;
    } else {
      email = sanitizeEmail(identifier);
    }

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
