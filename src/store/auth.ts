import { create } from "zustand";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseAuth, firestore, requireFirebase } from "../lib/firebase";
import {
  normalizeUsername,
  firebaseMessage,
  UsernameTakenError,
} from "../lib/authValidation";
export interface AccountProfile {
  username: string;
  displayName: string;
}
export const useAuth = create<{
  uid: string | null;
  email: string | null;
  profile: AccountProfile | null;
  loading: boolean;
  pending: boolean;
  error: string;
}>(() => ({
  uid: null,
  email: null,
  profile: null,
  loading: true,
  pending: false,
  error: "",
}));
export async function verifiedProfile(
  uid: string,
  data: AccountProfile,
): Promise<AccountProfile> {
  const { db } = requireFirebase();
  const name = normalizeUsername(data.username);
  if (name !== data.username)
    throw new Error("Profilindeki kullanıcı adı biçimi düzeltilmeli.");
  const ownership = await getDocFromServer(doc(db, "usernames", name));
  if (!ownership.exists())
    throw new Error(
      `@${name} için sahiplik kaydı eksik. Aynı kullanıcı adıyla profilini tamamla.`,
    );
  if (ownership.data().uid !== uid)
    throw new Error(
      `@${name} başka bir hesaba ait. Bu eski profilin kullanıcı adı düzeltilmeden giriş tamamlanamaz.`,
    );
  return { username: name, displayName: data.displayName };
}
export function observeAuth() {
  if (!firebaseAuth || !firestore) {
    useAuth.setState({ loading: false });
    return () => {};
  }
  let stopProfile = () => {};
  let revision = 0;
  let alive = true;
  const stopAuth = onAuthStateChanged(
    firebaseAuth,
    (user) => {
      stopProfile();
      revision++;
      useAuth.setState({
        uid: user?.uid ?? null,
        email: user?.email ?? null,
        profile: null,
        loading: !!user,
        error: "",
      });
      if (user) {
        stopProfile = onSnapshot(
          doc(firestore!, "users", user.uid),
          async (snap) => {
            const ticket = ++revision;
            if (!alive || firebaseAuth?.currentUser?.uid !== user.uid) return;
            const data = snap.data();
            useAuth.setState({ profile: null, loading: true });
            try {
              const profile = data
                ? await verifiedProfile(user.uid, data as AccountProfile)
                : null;
              if (
                alive &&
                ticket === revision &&
                firebaseAuth?.currentUser?.uid === user.uid
              )
                useAuth.setState({ profile, loading: false, error: "" });
            } catch (error) {
              if (
                alive &&
                ticket === revision &&
                firebaseAuth?.currentUser?.uid === user.uid
              )
                useAuth.setState({
                  profile: null,
                  loading: false,
                  error: firebaseMessage(error),
                });
            }
          },
          (error) => {
            revision++;
            if (alive && firebaseAuth?.currentUser?.uid === user.uid)
              useAuth.setState({
                loading: false,
                error: firebaseMessage(error),
              });
          },
        );
      }
    },
    (error) =>
      useAuth.setState({ loading: false, error: firebaseMessage(error) }),
  );
  return () => {
    alive = false;
    revision++;
    stopAuth();
    stopProfile();
  };
}
// Both documents commit together. Contention retries re-read the claimed name.
export async function claimProfile(value: string) {
  const username = normalizeUsername(value);
  const { auth, db } = requireFirebase();
  const user = auth.currentUser;
  if (!user) throw new Error("Önce giriş yap.");
  const profileRef = doc(db, "users", user.uid);
  const nameRef = doc(db, "usernames", username);
  let stage = "profile-read";
  try {
    await runTransaction(db, async (tx) => {
      stage = "profile-read";
      const profile = await tx.get(profileRef);
      stage = "username-read";
      const name = await tx.get(nameRef);
      if (name.exists() && name.data().uid !== user.uid)
        throw new UsernameTakenError();
      if (profile.exists()) {
        if (profile.data().username !== username)
          throw new Error("Bu hesabın profili zaten oluşturulmuş.");
        // Repair a legacy/manual profile only when its name is unclaimed.
        if (!name.exists()) {
          stage = "profile-write";
          tx.set(nameRef, { uid: user.uid });
        }
        return;
      }
      stage = "profile-write";
      if (!name.exists()) tx.set(nameRef, { uid: user.uid });
      tx.set(profileRef, {
        username,
        displayName: username,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "permission-denied") {
      const detail =
        stage === "username-read"
          ? "Kullanıcı adının uygunluğu kontrol edilemiyor."
          : stage === "profile-read"
            ? "Profil bilgilerine erişilemiyor."
            : "Profil ve kullanıcı adı birlikte kaydedilemiyor.";
      throw new Error(
        `${detail} E-posta hesabın mevcut; yeni hesap açmana gerek yok. Firestore erişim kuralları düzeltildikten sonra bu ekrandan tekrar deneyebilirsin.`,
      );
    }
    throw error;
  }
  // A previous permission error terminates onSnapshot. Confirm the committed
  // profile independently so a successful retry can finish without restarting.
  const confirmed = await getDocFromServer(profileRef);
  if (auth.currentUser?.uid === user.uid && confirmed.exists()) {
    const profile = await verifiedProfile(
      user.uid,
      confirmed.data() as AccountProfile,
    );
    if (auth.currentUser?.uid !== user.uid) return;
    useAuth.setState({
      profile,
      loading: false,
      error: "",
    });
  }
}
export async function accountAction(
  mode: "login" | "signup" | "reset" | "complete",
  email: string,
  password: string,
  username: string,
) {
  if (useAuth.getState().pending) return;
  if (mode === "signup" || mode === "complete") normalizeUsername(username);
  const { auth, db } = requireFirebase();
  useAuth.setState({ pending: true });
  try {
    if (mode === "reset") await sendPasswordResetEmail(auth, email.trim());
    else if (mode === "login")
      await signInWithEmailAndPassword(auth, email.trim(), password);
    else if (mode === "signup") {
      const normalized = normalizeUsername(username);
      // Server read must succeed before any Auth account is created.
      const existing = await getDocFromServer(doc(db, "usernames", normalized));
      if (existing.exists()) throw new UsernameTakenError();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      try {
        await claimProfile(normalized);
      } catch (error) {
        // A competing transaction may claim the name after the preflight.
        // Remove only the account created by this exact signup attempt.
        if (error instanceof UsernameTakenError) {
          try {
            await deleteUser(credential.user);
            useAuth.setState({
              uid: null,
              email: null,
              profile: null,
              loading: false,
              error: "",
            });
          } catch {
            await signOut(auth).catch(() => {});
            throw new Error(
              "Bu kullanıcı adı alınmış. Kayıt tamamlanmadı; bağlantı sorunu nedeniyle oluşturulan e-posta hesabı temizlenemedi.",
            );
          }
        }
        throw error;
      }
    } else await claimProfile(username);
  } finally {
    useAuth.setState({ pending: false });
  }
}
export async function logout() {
  await signOut(requireFirebase().auth);
}
