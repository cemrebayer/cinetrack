import { ReactNode, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useAuth, logout } from "../store/auth";
import { bindAccountCache } from "../lib/accountCache";
import { observeLogs } from "../lib/cloudLogs";
import { firebaseMessage } from "../lib/authValidation";
import { useAvatar, useLibrary } from "../store";
export function AccountSession({
  children,
  uid,
}: {
  children: ReactNode;
  uid: string;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const profile = useAuth((s) => s.profile);
  useEffect(() => {
    bindAccountCache(uid);
    setReady(false);
    setError("");
    let alive = true;
    const stop = observeLogs(
      uid,
      (logs) => {
        if (!alive) return;
        useLibrary.setState({ logs });
        setReady(true);
        setError("");
      },
      (e) => {
        if (alive) setError(firebaseMessage(e));
      },
    );
    return () => {
      alive = false;
      stop();
      bindAccountCache(null);
    };
  }, [uid, retry]);
  useEffect(() => {
    if (profile) useAvatar.setState({ username: profile.displayName });
  }, [profile, ready]);
  if (error || !ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#101017",
          justifyContent: "center",
          padding: 30,
          gap: 22,
        }}
      >
        {!error && <ActivityIndicator color="#b9a0ff" />}
        <Text style={{ color: "#ded1f3", textAlign: "center" }}>
          {error || "İzleme kayıtların yükleniyor…"}
        </Text>
        {!!error && (
          <Pressable
            onPress={() => setRetry((n) => n + 1)}
            accessibilityRole="button"
          >
            <Text style={{ color: "#c5afff", textAlign: "center" }}>
              Tekrar dene
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => logout().catch((e) => setError(firebaseMessage(e)))}
        >
          <Text style={{ color: "#c5afff", textAlign: "center" }}>
            Çıkış yap
          </Text>
        </Pressable>
      </View>
    );
  return <>{children}</>;
}
export function FirebaseAccount() {
  const email = useAuth((s) => s.email);
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: "#eee7fa" }}>{email}</Text>
      <Text style={{ color: "#aaa0bc", lineHeight: 21 }}>
        İzleme kayıtların hesabınla eşitlenir. Listeler, hedefler ve gardırop
        tercihleri şimdilik bu cihazda, hesabına özel saklanır.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => logout().catch((e) => setError(firebaseMessage(e)))}
        style={{ backgroundColor: "#352741", padding: 16, borderRadius: 12 }}
      >
        <Text style={{ color: "#dac6ff", textAlign: "center" }}>Çıkış yap</Text>
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#efb5bd" }}>
          {error}
        </Text>
      )}
    </View>
  );
}
