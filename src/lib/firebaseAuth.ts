import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export const createFirebaseAuth = (app: FirebaseApp) => getAuth(app);
