export class UsernameTakenError extends Error {
  constructor() {
    super("Bu kullanıcı adı alınmış. Başka bir ad seç.");
    this.name = "UsernameTakenError";
  }
}
export function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username))
    throw new Error(
      "Kullanıcı adın 3–30 karakter olmalı; a–z, rakam ve alt çizgi kullanabilirsin.",
    );
  return username;
}
export function firebaseMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-posta veya şifre yanlış.",
    "auth/wrong-password": "E-posta veya şifre yanlış.",
    "auth/user-not-found": "E-posta veya şifre yanlış.",
    "auth/email-already-in-use":
      "Bu e-posta ile bir hesap var. Giriş yapabilir veya şifreni yenileyebilirsin.",
    "auth/invalid-email": "Geçerli bir e-posta adresi yaz.",
    "auth/weak-password": "Daha güçlü bir şifre seç; en az 6 karakter kullan.",
    "auth/too-many-requests":
      "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.",
    "auth/network-request-failed":
      "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.",
    "auth/operation-not-allowed": "E-posta ile giriş henüz etkin değil.",
    "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
    "permission-denied":
      "Veriye erişim izni alınamadı. Hesap bağlantısı ve veritabanı kuralları kontrol edilmeli.",
    unavailable: "Sunucuya ulaşılamadı. Tekrar dene.",
  };
  return (
    (code && messages[code]) ||
    (error instanceof Error && !code
      ? error.message
      : "İşlem tamamlanamadı. Tekrar dene.")
  );
}
