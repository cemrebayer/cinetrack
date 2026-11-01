import { useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, Share } from "react-native";
import { useLists } from "../store/lists";
import { CustomList, listShareText } from "../lib/lists";
import {
  fetchCloudLists,
  publishList,
  renameCloud,
  changeCloudItem,
  inviteFriend,
  listMembers,
  removeMember,
  useSocialUser,
  socialError,
  Person,
} from "../lib/social";
import { searchMedia, demoMode } from "../lib/tmdb";
import { catalog } from "../lib/catalog";
import { MediaItem, MediaType } from "../types";
import { Action, Input, listStyles as s } from "./ListUI";
export function CustomLists({ type }: { type: MediaType }) {
  const user = useSocialUser();
  return (
    <CustomListsContent
      key={`${user ?? "local"}-${type}`}
      user={user}
      type={type}
    />
  );
}
function CustomListsContent({
  user,
  type,
}: {
  user: string | null;
  type: MediaType;
}) {
  const store = useLists();
  const [cloud, setCloud] = useState<CustomList[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>(catalog);
  const [friend, setFriend] = useState("");
  const [members, setMembers] = useState<Person[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [limit, setLimit] = useState(30);
  const [listLimit, setListLimit] = useState(30);
  const locals = store.lists.filter((l) => !l.cloudId);
  const lists = [...locals, ...cloud];
  const selected = lists.find((l) => l.id === selectedId);
  const visibleItems = selected?.items.filter((m) => m.type === type) ?? [];
  const visibleResults = results.filter((m) => m.type === type);
  const mediaLabel = type === "movie" ? "film" : "dizi";
  const owner = !selected?.cloudId || selected.ownerId === user;
  async function refresh() {
    if (user) setCloud(await fetchCloudLists());
  }
  useEffect(() => {
    setCloud([]);
    setSelectedId(null);
    setMembers([]);
    setMessage("");
    if (!user) return;
    let alive = true;
    const load = () =>
      fetchCloudLists()
        .then((rows) => {
          if (alive) setCloud(rows);
        })
        .catch((e) => {
          if (alive) setMessage(socialError(e));
        });
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user]);
  useEffect(() => {
    setMembers([]);
    setLimit(30);
    setQuery("");
    setFriend("");
    if (selected?.cloudId) {
      let alive = true;
      listMembers(selected.cloudId)
        .then((m) => {
          if (alive) setMembers(m);
        })
        .catch((e) => setMessage(socialError(e)));
      return () => {
        alive = false;
      };
    }
  }, [selectedId]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const items = query.trim()
          ? await searchMedia(query.trim(), controller.signal)
          : catalog;
        if (!controller.signal.aborted) setResults(items);
      } catch (e) {
        if (!controller.signal.aborted) setMessage(socialError(e));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  async function run(action: () => Promise<void> | void) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  async function change(media: MediaItem, remove = false) {
    if (!selected) return;
    if (selected.cloudId) {
      await changeCloudItem(selected.cloudId, media, remove);
      await refresh();
    } else if (remove) store.remove(selected.id, media.id);
    else store.add(selected.id, media);
  }
  function open(list: CustomList) {
    setSelectedId(list.id);
    setNewName(list.name);
    setMessage("");
  }
  return (
    <View style={{ gap: 18 }}>
      <Text style={s.title}>Kendi listelerin</Text>
      <Text style={s.muted}>
        İstediğin kadar liste oluştur. Bu bölümde listelerindeki yalnızca{" "}
        {mediaLabel} içerikleri görünür.
      </Text>
      <Input label="Yeni liste adı" value={name} onChange={setName} />
      <Action
        disabled={busy}
        title="＋ Liste oluştur"
        onPress={() =>
          run(() => {
            const id = store.create(name);
            setSelectedId(id);
            setNewName(name.trim());
            setName("");
          })
        }
      />
      {lists.slice(0, listLimit).map((list) => (
        <View key={list.id} style={s.card}>
          <Text style={s.title}>{list.name}</Text>
          <Text style={s.muted}>
            {list.items.filter((m) => m.type === type).length} {mediaLabel} ·{" "}
            {list.cloudId ? "Ortak / bulut liste" : "Kişisel liste"}
          </Text>
          <Action title="Listeyi aç" onPress={() => open(list)} />
        </View>
      ))}
      {lists.length > listLimit && (
        <Action
          title="Daha fazla liste"
          onPress={() => setListLimit((n) => n + 30)}
        />
      )}
      <Text style={s.muted}>
        Metin paylaşımı listenin o anki içeriğini gönderir. Ortak listeler
        hesabınla eşitlenir ve 30 saniyede bir yenilenir.
      </Text>
      {user && (
        <Action
          disabled={busy}
          title="Ortak listeleri yenile"
          onPress={() => run(refresh)}
        />
      )}
      <Text accessibilityRole="alert" style={s.muted}>
        {message}
      </Text>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setSelectedId(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000b",
            padding: 20,
            justifyContent: "center",
          }}
        >
          <View
            style={[
              s.card,
              {
                maxHeight: "92%",
                width: "100%",
                maxWidth: 580,
                alignSelf: "center",
              },
            ]}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={[s.title, { flex: 1 }]}>{selected?.name}</Text>
              <Action
                disabled={busy}
                title="Kapat"
                onPress={() => setSelectedId(null)}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
            >
              {selected && (
                <>
                  {owner && (
                    <>
                      <Input
                        label="Liste adı"
                        value={newName}
                        onChange={setNewName}
                      />
                      <Action
                        disabled={busy}
                        title="Adı güncelle"
                        onPress={() =>
                          run(async () => {
                            if (selected.cloudId) {
                              await renameCloud(selected.cloudId, newName);
                              await refresh();
                            } else store.rename(selected.id, newName);
                          })
                        }
                      />
                    </>
                  )}
                  <Action
                    disabled={busy}
                    title={`Listedeki ${mediaLabel} içeriklerini paylaş`}
                    onPress={() =>
                      run(async () => {
                        await Share.share({
                          message: listShareText({
                            ...selected,
                            items: visibleItems,
                          }),
                          title: selected.name,
                        });
                      })
                    }
                  />
                  {!selected.cloudId ? (
                    <>
                      <Text style={s.muted}>
                        Arkadaşlarınla birlikte düzenlemek için bu listeyi
                        buluta taşı.
                      </Text>
                      <Action
                        disabled={busy || !user}
                        title="Ortak listeye dönüştür"
                        onPress={() =>
                          run(async () => {
                            const id = await publishList(selected);
                            store.link(selected.id, id, user!);
                            await refresh();
                            setSelectedId(id);
                          })
                        }
                      />
                      {!user && (
                        <Text style={s.muted}>
                          Ortak listeler yeni hesap sistemine hazırlanıyor.
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={s.muted}>
                        Üyeler yapım ekleyip çıkarabilir. Liste adını ve üyeleri
                        sahibi yönetir.
                      </Text>
                      {owner && (
                        <>
                          <Input
                            label="Takipleştiğin arkadaşının kullanıcı adı"
                            value={friend}
                            onChange={setFriend}
                          />
                          <Action
                            disabled={busy}
                            title="Arkadaşı ortak düzenleyici yap"
                            onPress={() =>
                              run(async () => {
                                await inviteFriend(selected.cloudId!, friend);
                                setMembers(
                                  await listMembers(selected.cloudId!),
                                );
                                setFriend("");
                                setMessage(
                                  "Arkadaşın listeyi kendi Listelerim ekranında görebilir.",
                                );
                              })
                            }
                          />
                        </>
                      )}
                      {members.map((p) => (
                        <View key={p.id} style={s.row}>
                          <Text style={s.text}>@{p.handle}</Text>
                          {(owner || p.id === user) && (
                            <Action
                              disabled={busy}
                              title={
                                p.id === user
                                  ? "Listeden ayrıl"
                                  : "Erişimi kaldır"
                              }
                              onPress={() =>
                                run(async () => {
                                  await removeMember(selected.cloudId!, p.id);
                                  if (p.id === user) setSelectedId(null);
                                  else
                                    setMembers(
                                      await listMembers(selected.cloudId!),
                                    );
                                  await refresh();
                                })
                              }
                            />
                          )}
                        </View>
                      ))}
                    </>
                  )}
                  <Text style={s.title}>
                    {type === "movie" ? "Film ekle" : "Dizi ekle"}
                  </Text>
                  <Input
                    label={type === "movie" ? "Film ara" : "Dizi ara"}
                    value={query}
                    onChange={setQuery}
                  />
                  {demoMode && (
                    <Text style={s.muted}>
                      Örnek katalog · Canlı arama bağlantısı henüz yok.
                    </Text>
                  )}
                  {searching ? (
                    <Text style={s.muted}>Aranıyor…</Text>
                  ) : (
                    visibleResults.map((media) => (
                      <View key={media.id} style={s.row}>
                        <Text style={[s.text, { flex: 1 }]}>
                          {media.title} ·{" "}
                          {media.type === "movie" ? "Film" : "Dizi"}
                        </Text>
                        <Action
                          disabled={
                            busy ||
                            selected.items.some((m) => m.id === media.id)
                          }
                          title={
                            selected.items.some((m) => m.id === media.id)
                              ? "Eklendi"
                              : "Ekle"
                          }
                          onPress={() => run(() => change(media))}
                        />
                      </View>
                    ))
                  )}
                  {!searching && !visibleResults.length && (
                    <Text style={s.muted}>Sonuç bulunamadı.</Text>
                  )}
                  <Text style={s.title}>
                    Listedeki {mediaLabel} içerikleri · {visibleItems.length}
                  </Text>
                  {visibleItems.slice(0, limit).map((media) => (
                    <View key={media.id} style={s.row}>
                      <Text style={[s.text, { flex: 1 }]}>
                        {media.title} ·{" "}
                        {media.type === "movie" ? "Film" : "Dizi"}
                      </Text>
                      <Action
                        disabled={busy}
                        title="Çıkar"
                        onPress={() => run(() => change(media, true))}
                      />
                    </View>
                  ))}
                  {visibleItems.length > limit && (
                    <Action
                      title="Daha fazla göster"
                      onPress={() => setLimit((n) => n + 30)}
                    />
                  )}
                  <Text accessibilityRole="alert" style={s.muted}>
                    {message}
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
