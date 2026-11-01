import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { createFirebaseAuth } from "./firebaseAuth";
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId,
);
const app = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
export const firebaseAuth = app ? createFirebaseAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export function requireFirebase() {
  if (!firebaseAuth || !firestore)
    throw new Error("Firebase bağlantısı henüz yapılandırılmadı.");
  return { auth: firebaseAuth, db: firestore };
}
