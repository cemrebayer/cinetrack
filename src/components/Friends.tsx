import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import {
  getFriends,
  saveHandle,
  findPerson,
  follow,
  useSocialUser,
  socialError,
  Person,
} from "../lib/social";
import { Action, Input, listStyles as s } from "./ListUI";
export function Friends() {
  const user = useSocialUser();
  return <FriendsContent key={user ?? "local"} user={user} />;
}
function FriendsContent({ user }: { user: string | null }) {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getFriends>
  > | null>(null);
  const [handle, setHandle] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (user) {
      const d = await getFriends(user);
      setData(d);
      setHandle(d.profile?.handle ?? "");
    }
  }
  useEffect(() => {
    setData(null);
    setFound(null);
    setMessage("");
    if (user) refresh().catch((e) => setMessage(socialError(e)));
  }, [user]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setMessage(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  const card = (p: Person) => {
    const following = data?.following.includes(p.id);
    const follower = data?.followers.includes(p.id);
    return (
      <View key={p.id} style={{ gap: 8 }}>
        <Text style={s.text}>
          @{p.handle}{" "}
          {following && follower
            ? "· Arkadaşın"
            : follower
              ? "· Seni takip ediyor"
              : ""}
        </Text>
        <Action
          disabled={busy}
          title={following ? "Takibi bırak" : "Takip et"}
          onPress={() => run(() => follow(user!, p.id, following))}
        />
      </View>
    );
  };
  return (
    <View style={s.card}>
      <Text style={s.title}>Arkadaşların</Text>
      {!user ? (
        <Text style={s.muted}>
          Arkadaşlarını bulmak, takipleşmek ve ortak liste oluşturmak için
          hesabına giriş yap. Çevrimiçi hesap bağlantısı gerekli.
        </Text>
      ) : (
        <>
          <Text style={s.muted}>
            Karşılıklı takipleştiğin kişilerle ortak liste oluşturabilirsin.
          </Text>
          <Input label="Kullanıcı adın" value={handle} onChange={setHandle} />
          <Action
            disabled={busy}
            title="Kullanıcı adını kaydet"
            onPress={() => run(() => saveHandle(user, handle))}
          />
          <Input
            label="Arkadaşının tam kullanıcı adı"
            value={query}
            onChange={setQuery}
          />
          <Action
            disabled={busy || !data?.profile}
            title="Arkadaş bul"
            onPress={() =>
              run(async () => {
                const person = await findPerson(query);
                setFound(person?.id === user ? null : person);
                if (!person) setMessage("Kullanıcı bulunamadı.");
              })
            }
          />
          {found && found.id !== user && card(found)}
          <Text style={s.muted}>
            {data?.following.length ?? 0} takip · {data?.followers.length ?? 0}{" "}
            takipçi
          </Text>
          {data?.people.filter((p) => p.id !== found?.id).map(card)}
          <Action
            disabled={busy}
            title="Arkadaşları yenile"
            onPress={() => run(async () => {})}
          />
        </>
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={s.muted}>
          {message}
        </Text>
      )}
    </View>
  );
}
