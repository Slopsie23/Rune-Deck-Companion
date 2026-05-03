
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Hardcoded Firebase configuration to ensure it works everywhere (including Vercel)
// without needing manual environment variable setup.
const config = {
  apiKey: "AIzaSyBBQ8Ift0NVn4rwr56u5OS7vkqMSEmOetI",
  authDomain: "rune-deck-c2ad3.firebaseapp.com",
  projectId: "rune-deck-c2ad3",
  storageBucket: "rune-deck-c2ad3.firebasestorage.app",
  messagingSenderId: "617077627569",
  appId: "1:617077627569:web:1747ed7ec44c854b9d6090",
};

const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
