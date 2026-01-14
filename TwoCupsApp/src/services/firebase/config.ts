import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBr_ph2BvDkswN0xtWIz_o_e86WS1O6dDI",
  authDomain: "twocups-2026.firebaseapp.com",
  projectId: "twocups-2026",
  storageBucket: "twocups-2026.firebasestorage.app",
  messagingSenderId: "43746143400",
  appId: "1:43746143400:web:242e1488b1714dadeca69d",
  measurementId: "G-R8SP3CYBBS"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Get Firebase services
export const auth = getAuth(app);

// Initialize Firestore with persistence enabled
// Use the new persistent cache API (Firebase v9.8+)
export const db = (() => {
  try {
    // Try to initialize with persistent cache (new API)
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    // If already initialized (e.g., hot reload), get the existing instance
    return getFirestore(app);
  }
})();

// Set auth persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Helper: Get current user
export const getCurrentUser = () => auth.currentUser;

// Helper: Get current user ID
export const getCurrentUserId = () => auth.currentUser?.uid ?? null;
