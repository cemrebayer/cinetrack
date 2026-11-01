import { FirebaseApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { storage } from "./storage";
// Firebase's native entry exposes this API; TypeScript resolves its web entry.
const nativeAuth = Auth as typeof Auth & {
  getReactNativePersistence: (storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  }) => Auth.Persistence;
};
export function createFirebaseAuth(app: FirebaseApp) {
  try {
    return Auth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence({
        getItem: async (key) => storage.getItem(key),
        setItem: async (key, value) => {
          storage.setItem(key, value);
        },
        removeItem: async (key) => {
          storage.removeItem(key);
        },
      }),
    });
  } catch (error) {
    if ((error as { code?: string }).code === "auth/already-initialized")
      return Auth.getAuth(app);
    throw error;
  }
}
