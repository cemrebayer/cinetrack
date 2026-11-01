import { useEffect, useState } from "react";
import { Text, TextInput, Pressable } from "react-native";
import { supabase } from "../lib/backend";
import { useAvatar, useLibrary } from "../store";
import { validateLog } from "../lib/domain";
export function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  async function run(
    action: "login" | "signup" | "logout" | "backup" | "restore",
  ) {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "login" || action === "signup") {
        const result =
          action === "login"
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        setMessage(
          action === "signup"
            ? "E-posta doğrulama bağlantısını kontrol edin."
            : "Giriş yapıldı.",
        );
      } else if (action === "logout") {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        const {
          data: { user: current },
        } = await supabase.auth.getUser();
        if (!current) throw new Error("Önce giriş yapın.");
        if (action === "backup") {
          const { logs, watchlist, goals } = useLibrary.getState();
          const { username, body, equippedItems } = useAvatar.getState();
          const { error } = await supabase.from("backups").upsert({
            user_id: current.id,
            payload: {
              version: 1,
              logs,
              watchlist,
              goals,
              avatar: { username, body, equippedItems },
            },
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
          setMessage("Bu cihazın günlüğü buluta yedeklendi.");
        } else {
          const { data, error } = await supabase
            .from("backups")
            .select("payload")
            .eq("user_id", current.id)
            .single();
          if (error) throw error;
          const p = data.payload;
          if (p.version !== 1 || !Array.isArray(p.logs))
            throw new Error("Yedek biçimi desteklenmiyor.");
          p.logs.forEach(validateLog);
          const local = useLibrary.getState();
          const merged = new Map(local.logs.map((l) => [l.id, l]));
          p.logs.forEach((l: any) => {
            if (!merged.has(l.id)) merged.set(l.id, l);
          });
          const lists = new Map(
            local.watchlist.map((e) => [`${e.period}:${e.mediaItem.id}`, e]),
          );
          for (const e of p.watchlist ?? [])
            if (!lists.has(`${e.period}:${e.mediaItem.id}`))
              lists.set(`${e.period}:${e.mediaItem.id}`, e);
          useLibrary.setState({
            logs: [...merged.values()],
            watchlist: [...lists.values()],
            goals: { ...p.goals, ...local.goals },
          });
          setMessage("Bulut kayıtları bu cihazdaki günlükle birleştirildi.");
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }
  if (!supabase)
    return (
      <Text style={{ color: "#bdb3ce", lineHeight: 23 }}>
        Yerel moddasın. Kayıtların bu cihazda saklanır. Hesap ve bulut yedeği
        için .env dosyasında Supabase URL ve anon anahtarını ayarla; ardından
        supabase/schema.sql dosyasını projene uygula.
      </Text>
    );
  const button = (label: string, action: Parameters<typeof run>[0]) => (
    <Pressable
      key={action}
      disabled={busy}
      onPress={() => run(action)}
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#413453",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Text style={{ color: "white", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      {user ? (
        <>
          <Text style={{ color: "white" }}>{user}</Text>
          <Text style={{ color: "#aaa0bc" }}>
            Yedekleme bu cihazdaki günlüğün bulut kopyasını günceller. Geri
            yükleme kayıtları birleştirir; yerel kayıtları silmez. Otomatik
            eşitleme yapılmaz.
          </Text>
          {button("Buluta yedekle", "backup")}
          {button("Bulut kayıtlarını birleştir", "restore")}
          {button("Çıkış yap", "logout")}
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel="E-posta"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="E-posta"
            placeholderTextColor="#9c92ae"
            value={email}
            onChangeText={setEmail}
            style={{
              padding: 16,
              color: "white",
              backgroundColor: "#282034",
              borderRadius: 12,
            }}
          />
          <TextInput
            accessibilityLabel="Şifre"
            secureTextEntry
            placeholder="Şifre (en az 6 karakter)"
            placeholderTextColor="#9c92ae"
            value={password}
            onChangeText={setPassword}
            style={{
              padding: 16,
              color: "white",
              backgroundColor: "#282034",
              borderRadius: 12,
            }}
          />
          {button("Giriş yap", "login")}
          {button("Hesap oluştur", "signup")}
        </>
      )}
      <Text accessibilityRole="alert" style={{ color: "#cdbbff" }}>
        {busy ? "İşlem sürüyor…" : message}
      </Text>
    </>
  );
}
