import { describe, it, expect } from "vitest";
import { normalizeUsername, firebaseMessage } from "./authValidation";
describe("Firebase kullanıcı adı", () => {
  it("boşluk ve harf büyüklüğünü aynı ada dönüştürür", () => {
    expect(normalizeUsername(" CEMRE ")).toBe("cemre");
    expect(normalizeUsername("cemre")).toBe("cemre");
  });
  it("kural dışı adları reddeder", () => {
    for (const name of [
      "ab",
      "a".repeat(31),
      "cemre/bayer",
      "cemre.b",
      "çemre",
    ])
      expect(() => normalizeUsername(name)).toThrow();
  });
  it("kimlik bilgisi hatalarında anlaşılır sonuç verir", () => {
    expect(firebaseMessage({ code: "auth/invalid-credential" })).toBe(
      "E-posta veya şifre yanlış.",
    );
    expect(firebaseMessage(new Error("Bu kullanıcı adı alınmış."))).toBe(
      "Bu kullanıcı adı alınmış.",
    );
  });
});
