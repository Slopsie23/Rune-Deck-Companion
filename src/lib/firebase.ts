
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In AI Studio we have a local config file, but it's ignored by Git.
// For Vercel, we must use Environment Variables.
// We use a dynamic approach to avoid build errors when the file is missing.

// Use environment variables if present, otherwise fallback to default values.
// This allows the app to work in both AI Studio (local config) and Vercel (env vars).
const isProd = import.meta.env.PROD;

// Helper to get env var or fallback
const getEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key];
  return (value && value !== "") ? value : fallback;
};

const config = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyBBQ8Ift0NVn4rwr56u5OS7vkqMSEmOetI"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "rune-deck-c2ad3.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "rune-deck-c2ad3"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "rune-deck-c2ad3.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "617077627569"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:617077627569:web:1747ed7ec44c854b9d6090"),
};

// Debug log for production (safe values)
if (isProd) {
  console.log("Firebase Config Initialization:");
  console.log("- AuthDomain:", config.authDomain);
  console.log("- ProjectID:", config.projectId);
  console.log("- Has API Key:", !!import.meta.env.VITE_FIREBASE_API_KEY);
}

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const finalDatabaseId = (databaseId && databaseId !== "" && databaseId !== "undefined") ? databaseId : undefined;

const app = initializeApp(config);
export const db = getFirestore(app, finalDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
