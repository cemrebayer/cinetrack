import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  writes: [] as Array<[string, Record<string, unknown>]>,
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
  deniedPath: "",
  denyCommit: false,
  auth: { currentUser: { uid: "user-a" } },
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  createUserWithEmailAndPassword: fake.createAccount,
  deleteUser: fake.deleteAccount,
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("../lib/firebase", () => ({
  firebaseAuth: null,
  firestore: null,
  requireFirebase: () => ({ auth: fake.auth, db: {} }),
}));
vi.mock("firebase/firestore", () => {
  const snap = (path: string) => ({
    exists: () => fake.docs.has(path),
    data: () => fake.docs.get(path)!,
  });
  return {
    doc: (_: unknown, ...path: string[]) => path.join("/"),
    serverTimestamp: () => "server-time",
    onSnapshot: vi.fn(),
    getDocFromServer: async (path: string) => {
      if (path === fake.deniedPath) throw { code: "permission-denied" };
      return snap(path);
    },
    runTransaction: async (
      _: unknown,
      body: (tx: unknown) => Promise<void>,
    ) => {
      const pending: typeof fake.writes = [];
      await body({
        get: async (path: string) => {
          if (path === fake.deniedPath) throw { code: "permission-denied" };
          return snap(path);
        },
        set: (path: string, data: Record<string, unknown>) =>
          pending.push([path, data]),
      });
      if (fake.denyCommit) throw { code: "permission-denied" };
      for (const [path, data] of pending) {
        fake.docs.set(path, data);
        fake.writes.push([path, data]);
      }
    },
  };
});
import { claimProfile, useAuth, verifiedProfile, accountAction } from "./auth";
describe("Profil oluşturma ve kurtarma", () => {
  beforeEach(() => {
    fake.createAccount.mockReset();
    fake.deleteAccount.mockReset();
    fake.deleteAccount.mockResolvedValue(undefined);
    fake.createAccount.mockResolvedValue({ user: fake.auth.currentUser });
    fake.docs.clear();
    fake.writes = [];
    fake.deniedPath = "";
    fake.denyCommit = false;
    useAuth.setState({ profile: null, error: "", loading: false });
  });
  it("normalize edilmiş ad ile profil ve sahipliği aynı transaction içinde yazar", async () => {
    await claimProfile(" CEMRE ");
    expect(fake.docs.get("usernames/cemre")).toEqual({ uid: "user-a" });
    expect(fake.docs.get("users/user-a")).toEqual({
      username: "cemre",
      displayName: "cemre",
      createdAt: "server-time",
    });
    expect(useAuth.getState().profile?.username).toBe("cemre");
  });
  it("başkasının aldığı adı sahiplenmez veya profil oluşturmaz", async () => {
    fake.docs.set("usernames/cemre", { uid: "someone-else" });
    await expect(claimProfile("cemre")).rejects.toThrow("alınmış");
    expect(fake.writes).toHaveLength(0);
  });
  it("ad okuma izni hatasını profil yazma hatasından ayırır", async () => {
    fake.deniedPath = "usernames/cemre";
    await expect(claimProfile("cemre")).rejects.toThrow(
      "uygunluğu kontrol edilemiyor",
    );
    expect(fake.writes).toHaveLength(0);
  });
  it("reddedilen yazmadan sonra aynı hesap tekrar deneyebilir ve eski hata temizlenir", async () => {
    fake.denyCommit = true;
    await expect(claimProfile("cemre")).rejects.toThrow(
      "birlikte kaydedilemiyor",
    );
    expect(fake.writes).toHaveLength(0);
    useAuth.setState({ error: "previous permission error" });
    fake.denyCommit = false;
    await claimProfile("cemre");
    expect(useAuth.getState().error).toBe("");
    expect(useAuth.getState().profile?.username).toBe("cemre");
  });
  it("eski profil olsa bile başka kişiye ait adı kabul etmez", async () => {
    fake.docs.set("users/user-a", {
      username: "cemre",
      displayName: "Cemre",
      createdAt: "old",
    });
    fake.docs.set("usernames/cemre", { uid: "someone-else" });
    await expect(claimProfile("cemre")).rejects.toThrow("alınmış");
    expect(fake.writes).toHaveLength(0);
  });
  it("panelde oluşturulmuş profilin eksik sahipliğini profil tarihini değiştirmeden tamamlar", async () => {
    fake.docs.set("users/user-a", {
      username: "cemre",
      displayName: "Cemre",
      createdAt: "old",
    });
    await claimProfile("cemre");
    expect(fake.docs.get("usernames/cemre")).toEqual({ uid: "user-a" });
    expect(fake.docs.get("users/user-a")?.createdAt).toBe("old");
  });
  it("girişte sahipliği olmayan eski profili kabul etmez", async () => {
    await expect(
      verifiedProfile("user-a", { username: "cemre", displayName: "Cemre" }),
    ).rejects.toThrow("sahiplik kaydı eksik");
    fake.docs.set("usernames/cemre", { uid: "other" });
    await expect(
      verifiedProfile("user-a", { username: "cemre", displayName: "Cemre" }),
    ).rejects.toThrow("başka bir hesaba ait");
  });
  it("aynı görünen ada izin verirken kullanıcı adı sahipliğini UID ile doğrular", async () => {
    fake.docs.set("usernames/cemre", { uid: "user-a" });
    await expect(
      verifiedProfile("user-a", { username: "cemre", displayName: "Cemre" }),
    ).resolves.toEqual({ username: "cemre", displayName: "Cemre" });
    await expect(
      verifiedProfile("other", { username: "cemre", displayName: "Cemre" }),
    ).rejects.toThrow("başka bir hesaba ait");
  });
  it("alınmış kullanıcı adında Auth hesabını hiç oluşturmaz", async () => {
    fake.docs.set("usernames/cemre", { uid: "other" });
    await expect(
      accountAction("signup", "test@example.com", "password", " CEMRE "),
    ).rejects.toThrow("alınmış");
    expect(fake.createAccount).not.toHaveBeenCalled();
    expect(fake.writes).toHaveLength(0);
  });
  it("uygunluk kontrolü reddedilirse hesap oluşturmaz", async () => {
    fake.deniedPath = "usernames/cemre";
    await expect(
      accountAction("signup", "test@example.com", "password", "cemre"),
    ).rejects.toMatchObject({ code: "permission-denied" });
    expect(fake.createAccount).not.toHaveBeenCalled();
  });
  it("kontrolden sonra adı başkası alırsa yalnızca bu denemenin yeni hesabını kaldırır", async () => {
    fake.createAccount.mockImplementation(async () => {
      fake.docs.set("usernames/cemre", { uid: "other" });
      return { user: fake.auth.currentUser };
    });
    await expect(
      accountAction("signup", "test@example.com", "password", "cemre"),
    ).rejects.toThrow("alınmış");
    expect(fake.deleteAccount).toHaveBeenCalledWith(fake.auth.currentUser);
    expect(fake.writes).toHaveLength(0);
  });
  it("boş kullanıcı adında hesabı ve profili oluşturur", async () => {
    await accountAction("signup", "test@example.com", "password", "cemre");
    expect(fake.createAccount).toHaveBeenCalledTimes(1);
    expect(fake.docs.get("usernames/cemre")).toEqual({ uid: "user-a" });
    expect(fake.deleteAccount).not.toHaveBeenCalled();
  });
});
