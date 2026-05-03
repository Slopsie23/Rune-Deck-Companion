
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In AI Studio we have a local config file, but it's ignored by Git.
// For Vercel, we must use Environment Variables.
// We use a dynamic approach to avoid build errors when the file is missing.

// Use environment variables if present, otherwise fallback to local config values.
// This allows the app to work in both AI Studio (local config) and Vercel (env vars).
const isProd = import.meta.env.PROD;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBQ8Ift0NVn4rwr56u5OS7vkqMSEmOetI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rune-deck-c2ad3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rune-deck-c2ad3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rune-deck-c2ad3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "617077627569",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:617077627569:web:1747ed7ec44c854b9d6090",
};

// Debug log voor Vercel (zonder volledige API key voor veiligheid)
if (isProd) {
  console.log("Firebase AuthDomain in use:", config.authDomain);
  console.log("Firebase ProjectID in use:", config.projectId);
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    console.warn("Vercel: VITE_FIREBASE_API_KEY niet gevonden in Environment Variables, we gebruiken de fallback.");
  }
}

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

const app = initializeApp(config);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
