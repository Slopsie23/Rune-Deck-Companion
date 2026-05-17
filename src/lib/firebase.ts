
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Configuration priority: Environment Variables -> Fallback hardcoded (will fix soon)
const firebaseConfig = {
  apiKey: "AIzaSyBM2hdyHb47y_bjJ2m9wBO2yP1JgWVBsc8",
  authDomain: "rune-deck-c2ad3.firebaseapp.com",
  projectId: "rune-deck-c2ad3",
  storageBucket: "rune-deck-c2ad3.firebasestorage.app",
  messagingSenderId: "617077627569",
  appId: "1:617077627569:web:e0ec18baba66b15f9d6090",
  firestoreDatabaseId: "ai-studio-6f1a7e9b-97f6-4121-8b80-4a4b506edc95"
};

console.log("[Firebase Init] Init starting with Config:", {
  projectId: firebaseConfig.projectId,
  dbId: firebaseConfig.firestoreDatabaseId
});

const app = initializeApp(firebaseConfig);
const firestoreDbId = firebaseConfig.firestoreDatabaseId;

// For the Web SDK initializeFirestore signature:
// initializeFirestore(app, settings, databaseId?)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firestoreDbId && firestoreDbId !== "(default)") ? firestoreDbId : undefined);

console.log("[Firebase Init] Firestore instance created.");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
