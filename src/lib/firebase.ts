
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In AI Studio we have a local config file, but it's ignored by Git.
// For Vercel, we must use Environment Variables.
// We use a dynamic approach to avoid build errors when the file is missing.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// This is a helper to merge local config if available (only during development/local build)
// In production (Vercel), these env vars must be set in the Vercel Dashboard.
const app = initializeApp(firebaseConfig.apiKey ? firebaseConfig : {
  // Fallback for AI Studio preview if env vars aren't set yet
  // We use the values you already have in your local firebase-applet-config.json
  apiKey: "AIzaSyBBQ8Ift0NVn4rwr56u5OS7vkqMSEmOetI",
  authDomain: "rune-deck-c2ad3.firebaseapp.com",
  projectId: "rune-deck-c2ad3",
  storageBucket: "rune-deck-c2ad3.firebasestorage.app",
});

export const db = getFirestore(app, databaseId || undefined);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
