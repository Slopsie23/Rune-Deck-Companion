
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
console.log("[Firebase Init] Using Firestore Database ID:", firestoreDbId || "(default)");
// If the ID is "(default)" or missing, use the default constructor
export const db = firestoreDbId && firestoreDbId !== "(default)" 
  ? getFirestore(app, firestoreDbId) 
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
