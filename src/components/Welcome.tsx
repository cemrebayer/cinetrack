import { ReactNode, useState, useEffect } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useWelcome } from "../store/welcome";
import { useAuth, observeAuth, accountAction, logout } from "../store/auth";
import { firebaseConfigured } from "../lib/firebase";
import { firebaseMessage } from "../lib/authValidation";
import { AccountSession } from "./AccountSession";
const slides = [
  {
    icon: "film-outline" as const,
    tag: "KENDİ SİNEMA EVRENİN",
    title: "Her hikâye\nbir iz bırakır.",
    text: "İzlediğin filmleri ve dizileri kaydet. Puanların, notların ve anıların tek bir yerde kalsın.",
    accent: "#b9a0ff",
  },
  {
    icon: "calendar-outline" as const,
    tag: "BİRİKEN GÜZEL ANLAR",
    title: "Takviminde\nhikâyeler var.",
    text: "İzlediklerini afişlerle hatırla. Film ve dizi dünyaların arasında geç; her birine ayırdığın zamanı gör.",
    accent: "#99dccb",
  },
  {
    icon: "sparkles-outline" as const,
    tag: "SEN İZLEDİKÇE GELİŞİR",
    title: "Yol arkadaşın\nseninle büyüsün.",
    text: "Her izleyişte XP kazan, avatarına yeni parçalar aç. Kendi listelerini oluştur, sıradaki hikâyene yer ayır.",
    accent: "#f1c48e",
  },
];
function CTA({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={[s.cta, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.ctaText, secondary && { color: "#d1c0f6" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function WelcomeGate({ children }: { children: ReactNode }) {
  const flow = useWelcome();
  const [page, setPage] = useState(0);
  const auth = useAuth();
  useEffect(() => observeAuth(), []);
  if (flow.completed && auth.loading && !auth.pending)
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center" }]}>
        <ActivityIndicator color="#b9a0ff" />
      </SafeAreaView>
    );
  if (
    flow.completed &&
    auth.uid &&
    auth.profile &&
    !auth.pending &&
    !auth.error
  )
    return (
      <AccountSession key={auth.uid} uid={auth.uid}>
        {children}
      </AccountSession>
    );
  if (flow.completed) return <AuthScreen />;
  const slide = slides[page];
  const finish = () => {
    setPage(0);
    flow.finish();
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.top}>
          <Text style={s.brand}>cinetrack ✦</Text>
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
            <Text style={s.muted}>Atla</Text>
          </Pressable>
        </View>
        <Animated.View
          key={page}
          entering={FadeIn.duration(250)}
          style={s.story}
        >
          <View style={s.art}>
            <View style={[s.orbit, { borderColor: slide.accent + "45" }]} />
            <View style={[s.ticket, { transform: [{ rotate: "-9deg" }] }]}>
              <Text style={s.ticketLabel}>
                CIN E TRACK / {String(page + 1).padStart(2, "0")}
              </Text>
              <Ionicons name={slide.icon} size={84} color={slide.accent} />
              <View style={s.dashes} />
              <Text style={[s.ticketFooter, { color: slide.accent }]}>
                {page === 0
                  ? "SENİN HİKÂYEN"
                  : page === 1
                    ? "HATIRLAMAYA DEĞER"
                    : "+50 XP · YENİ BİR SAHNE"}
              </Text>
            </View>
            <View style={s.badge}>
              <Ionicons name="star" size={18} color={slide.accent} />
              <Text style={s.badgeText}>
                {page === 0
                  ? "İyi ki izlemişim."
                  : page === 1
                    ? "Bir gün, bir afiş."
                    : "Bir seviye daha."}
              </Text>
            </View>
          </View>
          <Text style={[s.tag, { color: slide.accent }]}>{slide.tag}</Text>
          <Text style={s.title}>{slide.title}</Text>
          <Text style={s.description}>{slide.text}</Text>
        </Animated.View>
        <View style={s.bottom}>
          <View style={s.dots}>
            {slides.map((_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}. tanıtım sayfası`}
                accessibilityState={{ selected: i === page }}
                onPress={() => setPage(i)}
                hitSlop={14}
              >
                <View style={[s.dot, i === page && s.activeDot]} />
              </Pressable>
            ))}
          </View>
          <CTA
            label={page === 2 ? "Hikâyene başla →" : "Devam et →"}
            onPress={() => (page === 2 ? finish() : setPage(page + 1))}
          />
          {page > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPage(page - 1)}
              style={s.link}
            >
              <Text style={s.muted}>Geri</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const auth = useAuth();
  const completing = !!auth.uid && !auth.profile;
  function switchMode(next: typeof mode) {
    if (auth.pending) return;
    setMode(next);
    setPassword("");
    setMessage("");
  }
  async function submit() {
    if (auth.pending) return;
    setMessage("");
    if (
      (mode === "signup" || completing) &&
      !/^[a-z0-9_]{3,30}$/.test(username.trim().toLowerCase())
    )
      return setMessage(
        "Kullanıcı adın 3–30 karakter olmalı; harf, rakam ve alt çizgi kullanabilirsin.",
      );
    if (!completing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setMessage("Geçerli bir e-posta adresi yaz.");
    if (!completing && mode !== "reset" && password.length < 6)
      return setMessage("Şifren en az 6 karakter olmalı.");
    try {
      await accountAction(
        completing ? "complete" : mode,
        email,
        password,
        username,
      );
      setPassword("");
      if (mode === "reset")
        setMessage(
          "Bu adresle bir hesap varsa şifre yenileme bağlantısı gönderildi. Gelen kutunu kontrol et.",
        );
    } catch (error) {
      setMessage(firebaseMessage(error));
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <Text style={s.brand}>cinetrack ✦</Text>
          <View style={s.authHero}>
            <View style={s.authIcon}>
              <Ionicons name="sparkles-outline" size={34} color="#c7b0ff" />
            </View>
            <Text style={s.tag}>HİKÂYEN BURADA DEVAM EDİYOR</Text>
            <Text style={s.title}>
              {completing
                ? "Profilini\ntamamla."
                : mode === "signup"
                  ? "Sana bir yer\nayırdık."
                  : mode === "reset"
                    ? "Yeni bir\nbaşlangıç."
                    : "Yeniden\nhoş geldin."}
            </Text>
            <Text style={s.description}>
              {completing
                ? "Hesabın hazır. Sana ait benzersiz bir kullanıcı adı seç."
                : mode === "signup"
                  ? "Kendi sinema günlüğüne ilk adımı at."
                  : mode === "reset"
                    ? "Şifreni yenilemek için hesabının e-posta adresini yaz."
                    : "Filmlerin, dizilerin ve biriktirdiğin anılar seni bekliyor."}
            </Text>
          </View>
          <View style={s.form}>
            {(mode === "signup" || completing) && (
              <>
                <Text style={s.label}>Kullanıcı adı</Text>
                <TextInput
                  style={s.input}
                  accessibilityLabel="Kullanıcı adı"
                  placeholder="sinema_yolcusu"
                  placeholderTextColor="#716b82"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                  maxLength={30}
                  textContentType="username"
                />
                <Text style={s.small}>
                  3–30 karakter · a–z, 0–9 ve alt çizgi
                </Text>
              </>
            )}
            {!completing && (
              <>
                <Text style={s.label}>E-posta</Text>
                <TextInput
                  style={s.input}
                  accessibilityLabel="E-posta"
                  placeholder="sen@ornek.com"
                  placeholderTextColor="#716b82"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                />
              </>
            )}
            {!completing && mode !== "reset" && (
              <>
                <Text style={s.label}>Şifre</Text>
                <View style={s.password}>
                  <TextInput
                    style={[s.input, { flex: 1, borderWidth: 0 }]}
                    accessibilityLabel="Şifre"
                    placeholder="En az 6 karakter"
                    placeholderTextColor="#716b82"
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={
                      mode === "signup" ? "newPassword" : "password"
                    }
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      visible ? "Şifreyi gizle" : "Şifreyi göster"
                    }
                    onPress={() => setVisible(!visible)}
                    style={{ padding: 16 }}
                  >
                    <Ionicons
                      name={visible ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color="#bcb1d0"
                    />
                  </Pressable>
                </View>
              </>
            )}
            {!completing && mode === "login" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => switchMode("reset")}
                style={s.forgot}
              >
                <Text style={s.linkText}>Şifremi unuttum</Text>
              </Pressable>
            )}
            {!firebaseConfigured && (
              <Text style={s.small}>
                Hesap bağlantısı henüz hazır değil. Kurulum tamamlandığında
                giriş yapabilirsin.
              </Text>
            )}
            {!!auth.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {auth.error}
              </Text>
            )}
            {!!message && (
              <Text accessibilityRole="alert" style={s.error}>
                {message}
              </Text>
            )}
            <CTA
              disabled={auth.pending || !firebaseConfigured}
              label={
                auth.pending
                  ? "İşlem sürüyor…"
                  : completing
                    ? "Profilini tamamla →"
                    : mode === "login"
                      ? "Giriş yap →"
                      : mode === "signup"
                        ? "Hesap oluştur →"
                        : "Yenileme bağlantısı gönder"
              }
              onPress={submit}
            />
            {!completing && (
              <Pressable
                disabled={auth.pending}
                accessibilityRole="button"
                style={s.link}
                onPress={() =>
                  switchMode(mode === "login" ? "signup" : "login")
                }
              >
                <Text style={s.muted}>
                  {mode === "login"
                    ? "Henüz hesabın yok mu? "
                    : "Giriş ekranına dön "}
                  <Text style={s.linkText}>
                    {mode === "login" ? "Kayıt ol" : "→"}
                  </Text>
                </Text>
              </Pressable>
            )}
            {completing && (
              <CTA
                label="Çıkış yap"
                secondary
                disabled={auth.pending}
                onPress={() =>
                  logout().catch((e) => setMessage(firebaseMessage(e)))
                }
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101017" },
  content: {
    flexGrow: 1,
    padding: 26,
    gap: 24,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#eae1ff",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -1,
  },
  muted: { color: "#a49ab5", fontSize: 14, lineHeight: 22 },
  story: { flex: 1, gap: 18 },
  art: {
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  orbit: {
    position: "absolute",
    width: 255,
    height: 255,
    borderRadius: 130,
    borderWidth: 1,
    backgroundColor: "#1a1527",
  },
  ticket: {
    width: 185,
    height: 232,
    borderRadius: 23,
    backgroundColor: "#282035",
    borderWidth: 1,
    borderColor: "#574568",
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketLabel: { fontSize: 9, letterSpacing: 2, color: "#b3a5c6" },
  ticketFooter: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  dashes: {
    width: "100%",
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#635171",
  },
  badge: {
    position: "absolute",
    bottom: 14,
    right: 0,
    flexDirection: "row",
    gap: 8,
    padding: 15,
    backgroundColor: "#332840",
    borderRadius: 16,
    transform: [{ rotate: "5deg" }],
  },
  badgeText: { color: "#ede4fa", fontSize: 12 },
  tag: { color: "#b9a0ff", fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  title: {
    color: "#f4effc",
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.6,
    fontWeight: "800",
  },
  description: { color: "#b1a7c0", fontSize: 16, lineHeight: 26 },
  bottom: { gap: 16, marginTop: "auto", paddingTop: 10 },
  dots: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    padding: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 6, backgroundColor: "#44394f" },
  activeDot: { width: 26, backgroundColor: "#b9a0ff" },
  cta: {
    minHeight: 54,
    backgroundColor: "#b9a0ff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  ctaText: { color: "#20162f", fontWeight: "700", fontSize: 15 },
  secondary: {
    backgroundColor: "#231b30",
    borderWidth: 1,
    borderColor: "#443353",
  },
  authHero: { gap: 16, paddingTop: 10 },
  authIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#2a203a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  form: { gap: 12 },
  label: { color: "#d8cfe4", fontSize: 13, marginTop: 4 },
  input: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#1f1929",
    color: "#f1eafa",
    padding: 16,
    borderWidth: 1,
    borderColor: "#3c314a",
    fontSize: 15,
  },
  password: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3c314a",
    backgroundColor: "#1f1929",
  },
  small: { color: "#9c90ac", fontSize: 12, lineHeight: 19 },
  forgot: { alignSelf: "flex-end", paddingVertical: 6 },
  link: { alignItems: "center", padding: 10 },
  linkText: { color: "#c5afff", fontWeight: "600", fontSize: 14 },
  error: {
    color: "#efb5bd",
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: "#32212d",
    padding: 12,
    borderRadius: 12,
  },
});
