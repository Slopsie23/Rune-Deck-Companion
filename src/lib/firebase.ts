
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// We use environment variables as the primary source of truth.
// These should be set in Vercel or your local .env file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// Check if we have at least the minimum required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase configuration is missing! Set VITE_FIREBASE_* environment variables.");
}

const app = initializeApp(firebaseConfig);
const firestoreDbId = firebaseConfig.firestoreDatabaseId;
console.log("[Firebase Init] Using Firestore Database ID:", firestoreDbId || "(default)");

export const db = firestoreDbId && firestoreDbId !== "(default)" 
  ? getFirestore(app, firestoreDbId) 
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
