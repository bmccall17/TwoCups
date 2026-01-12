import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);

// Helper: Get current user
export const getCurrentUser = () => auth.currentUser;

// Helper: Get current user ID
export const getCurrentUserId = () => auth.currentUser?.uid ?? null;
