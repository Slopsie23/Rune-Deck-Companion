
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import localFirebaseConfig from '../../firebase-applet-config.json';

// Use environment variables if present, otherwise fallback to local config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (localFirebaseConfig as any).messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (localFirebaseConfig as any).appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (localFirebaseConfig as any).measurementId,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || (localFirebaseConfig as any).firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
