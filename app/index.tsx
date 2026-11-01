import { EpisodePicker } from "../src/components/EpisodePicker";
import { EpisodeSelection } from "../src/lib/tvEpisodes";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar } from "../src/components/Avatar";
import { DatePicker } from "../src/components/DatePicker";
import { useAvatar, useFilters, useLibrary } from "../src/store";
import { progression, recap } from "../src/lib/domain";
import { items, catalog } from "../src/lib/catalog";
import { searchMedia, mediaDetails, demoMode } from "../src/lib/tmdb";
import { MediaItem, WatchLog } from "../src/types";
import { WatchCalendar } from "../src/components/WatchCalendar";
import {
  lifetimeStats,
  formatDuration,
  logsForType,
} from "../src/lib/watchHistory";
import { Discover } from "../src/components/Discover";
import { CustomLists } from "../src/components/CustomLists";
import { goalPercent } from "../src/lib/lists";
import { FirebaseAccount } from "../src/components/AccountSession";
import { saveCloudLog, removeCloudLog } from "../src/lib/cloudLogs";
import { firebaseMessage } from "../src/lib/authValidation";
import { useAuth } from "../src/store/auth";
import { useWelcome } from "../src/store/welcome";
const now = new Date();
const currentYear = now.getFullYear();
const tabs = [
  ["home", "planet-outline", "Keşfet"],
  ["activity", "time-outline", "Aktivite"],
  ["add", "add", "Ekle"],
  ["list", "bookmark-outline", "Listelerim"],
  ["profile", "person-outline", "Profil"],
] as const;
function Button({
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
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.4 }]}
    >
      <Text style={[s.buttonText, secondary && { color: "#ddd7ff" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export default function Screen() {
  const [tab, setTab] = useState<string>("home");
  const [modal, setModal] = useState<"search" | "wardrobe" | "media" | null>(
    null,
  );
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(catalog);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [date, setDate] = useState(new Date());
  const [rating, setRating] = useState<number | undefined>();
  const [review, setReview] = useState("");
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [episodeReady, setEpisodeReady] = useState(false);
  const chooseEpisode = useCallback((choice: EpisodeSelection | null) => {
    setSeason(choice ? String(choice.seasonNumber) : "");
    setEpisode(choice ? String(choice.episodeNumber) : "");
    setEpisodeReady(!!choice);
  }, []);
  const [isRewatch, setIsRewatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [goal, setGoal] = useState("50");
  const library = useLibrary();
  const avatar = useAvatar();
  const accountUsername = useAuth((state) => state.profile?.username);
  const filter = useFilters();
  const progress = progression(library.logs);
  const mediaType = filter.type;
  const sectionName = mediaType === "movie" ? "Filmler" : "Diziler";
  const sectionLogs = useMemo(
    () => logsForType(library.logs, mediaType),
    [library.logs, mediaType],
  );
  const totals = lifetimeStats(sectionLogs);
  const seriesCount = new Set(sectionLogs.map((log) => log.mediaItem.id)).size;
  const visibleResults = results.filter((m) => m.type === mediaType);
  const thisYear = recap(sectionLogs, currentYear);
  const goalValue = library.goals[currentYear] ?? 50;
  const periodKey =
    period === "year"
      ? String(currentYear)
      : `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  useEffect(() => {
    if (modal !== "search") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setResults(
          query.trim()
            ? await searchMedia(query.trim(), controller.signal)
            : catalog,
        );
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Arama başarısız.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, modal]);
  useEffect(() => {
    if (!selected) return;
    setIsRewatch(
      library.logs.some(
        (l) =>
          l.mediaItem.id === selected.id &&
          (selected.type === "movie" ||
            (l.seasonNumber === Number(season) &&
              l.episodeNumber === Number(episode))),
      ),
    );
  }, [selected?.id, season, episode]);
  function pick(media: MediaItem) {
    setSelected(media);
    setDate(new Date());
    setRating(undefined);
    setReview("");
    setSeason("");
    setEpisodeReady(false);
    setEpisode("");
    setIsRewatch(false);
    setError("");
  }
  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    try {
      if (
        selected.type === "tv" &&
        (!episodeReady ||
          !Number.isInteger(Number(season)) ||
          Number(season) < 0 ||
          !Number.isInteger(Number(episode)) ||
          Number(episode) < 1)
      )
        throw new Error("Lütfen listeden bir sezon ve bölüm seç.");
      const detail = await mediaDetails(
        selected,
        Number(season),
        Number(episode),
      );
      if (!detail.runtimeMinutes)
        throw new Error(
          "Bu yapımın süresi henüz bulunamadı. Lütfen daha sonra tekrar dene.",
        );
      const before = progress.level;
      const newLog: WatchLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        mediaItem: detail,
        watchedAt: date.toISOString(),
        createdAt: new Date().toISOString(),
        isRewatch,
        rating,
        review: review.trim() || undefined,
        ...(detail.type === "tv"
          ? { seasonNumber: Number(season), episodeNumber: Number(episode) }
          : {}),
      };
      await saveCloudLog(newLog);
      library.addLog(newLog);
      const after = progression(useLibrary.getState().logs).level;
      setNotice(
        after > before
          ? `Seviye ${after}! Yeni bir sahneye hazırsın. ✨`
          : `Aktivitene eklendi. +${detail.type === "movie" ? 50 : 15} XP ✦`,
      );
      setSelected(null);
      setModal(null);
      setTab("activity");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi.");
    } finally {
      setSaving(false);
    }
  }
  const header = (
    <View style={s.header}>
      <View style={s.row}>
        <View style={s.logo}>
          <Ionicons name="film" size={23} color="#b8a8ff" />
        </View>
        <Text style={s.brand}>
          cinetrack<Text style={{ color: "#ad98ff" }}> ✦</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bölüm değiştir: ${sectionName}`}
        onPress={() => setModal("media")}
        style={s.mediaSwitch}
      >
        <Ionicons
          name={mediaType === "movie" ? "film-outline" : "tv-outline"}
          size={18}
          color="#c5b7ff"
        />
        <Text style={s.lilac}>{sectionName}</Text>
        <Ionicons name="chevron-down" size={16} color="#c5b7ff" />
      </Pressable>
    </View>
  );
  return (
    <SafeAreaView style={s.safe}>
      {header}
      <ScrollView key={`${tab}-${mediaType}`} contentContainerStyle={s.content}>
        {notice ? (
          <Pressable onPress={() => setNotice("")} style={s.notice}>
            <Text style={{ color: "#b9ead3" }}>{notice} ×</Text>
          </Pressable>
        ) : null}
        {tab === "home" && (
          <Discover
            type={mediaType}
            logs={sectionLogs}
            watchlist={library.watchlist}
            onToggle={library.toggleList}
          />
        )}
        {tab === "activity" && (
          <>
            <Text style={s.eyebrow}>SON İZLEDİKLERİN</Text>
            <Text style={s.title}>Aktivite</Text>
            <WatchCalendar logs={sectionLogs} label={sectionName} />
            <Text style={s.muted}>
              {sectionName} · En son izlediğinden başlayarak
            </Text>
            {sectionLogs.length === 0 && (
              <View style={s.card}>
                <Text style={s.subtitle}>İlk sahneyi sen aç.</Text>
                <Text style={s.muted}>
                  Bu bölümde henüz izleme kaydın yok. Alttaki + ile ilk kaydını
                  ekle.
                </Text>
              </View>
            )}
            {[...sectionLogs]
              .sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt))
              .map((l) => (
                <Animated.View entering={FadeInDown} key={l.id} style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.section}>{l.mediaItem.title}</Text>
                    <Pressable
                      accessibilityLabel="Kaydı sil"
                      onPress={async () => {
                        try {
                          await removeCloudLog(l.id);
                          library.removeLog(l.id);
                          setNotice("Kayıt silindi; XP yeniden hesaplandı.");
                        } catch (e) {
                          setNotice(firebaseMessage(e));
                        }
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        color="#aca4b9"
                        size={20}
                      />
                    </Pressable>
                  </View>
                  <Text style={s.muted}>
                    {new Date(l.watchedAt).toLocaleDateString("tr-TR")} ·{" "}
                    {l.mediaItem.runtimeMinutes} dk{" "}
                    {l.mediaItem.type === "tv"
                      ? `· S${l.seasonNumber} B${l.episodeNumber}`
                      : ""}
                  </Text>
                  {l.isRewatch && <Text style={s.lilac}>↻ Tekrar izleme</Text>}
                  {l.rating && (
                    <Text style={s.lilac}>{"★".repeat(l.rating)}</Text>
                  )}
                  {l.review && <Text style={s.text}>{l.review}</Text>}
                </Animated.View>
              ))}
          </>
        )}
        {tab === "list" && (
          <>
            <Text style={s.eyebrow}>SIRADAKİ GÜZEL ŞEYLER</Text>
            <Text style={s.title}>Listelerim</Text>
            <CustomLists type={mediaType} />
            {mediaType === "movie" && (
              <View style={s.card}>
                <Text style={s.section}>{currentYear} film hedefin</Text>
                <Text style={s.statNumber}>
                  {thisYear.movies}
                  <Text style={s.muted}> / {goalValue} film</Text>
                </Text>
                <Text style={s.lilac}>
                  %{goalPercent(thisYear.movies, goalValue)} tamamlandı
                </Text>
                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      {
                        width: `${Math.min(100, (thisYear.movies / goalValue) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={s.row}>
                  <TextInput
                    accessibilityLabel="Yıllık film hedefi"
                    style={[s.input, { flex: 1 }]}
                    value={goal}
                    onChangeText={setGoal}
                    keyboardType="number-pad"
                  />
                  <Button
                    label="Hedefi güncelle"
                    onPress={() => {
                      const n = Number(goal);
                      if (Number.isInteger(n) && n > 0 && n <= 10000) {
                        library.setGoal(currentYear, n);
                        setNotice("Hedef güncellendi.");
                      } else setNotice("1–10000 arasında tam sayı gir.");
                    }}
                  />
                </View>
              </View>
            )}
            <View style={s.row}>
              <Button
                label="Bu ay"
                secondary={period !== "month"}
                onPress={() => setPeriod("month")}
              />
              <Button
                label="Bu yıl"
                secondary={period !== "year"}
                onPress={() => setPeriod("year")}
              />
            </View>
            {library.watchlist
              .filter(
                (e) => e.period === periodKey && e.mediaItem.type === mediaType,
              )
              .map((e) => (
                <View key={e.mediaItem.id} style={s.card}>
                  <Text style={s.section}>{e.mediaItem.title}</Text>
                  <View style={s.row}>
                    <Button
                      label="İzledim"
                      onPress={() => {
                        setModal("search");
                        pick(e.mediaItem);
                      }}
                    />
                    <Button
                      label="Listeden çıkar"
                      secondary
                      onPress={() => library.toggleList(e)}
                    />
                  </View>
                </View>
              ))}
            {!library.watchlist.some(
              (e) => e.period === periodKey && e.mediaItem.type === mediaType,
            ) && (
              <Text style={s.muted}>
                Bu liste henüz boş. Alttaki + ile bir yapım bul ve listene ekle.
              </Text>
            )}
          </>
        )}
        {tab === "profile" && (
          <>
            <Text style={s.eyebrow}>SENİN SİNEMA KİMLİĞİN</Text>
            <Text style={s.title}>Profil</Text>
            <View style={s.card}>
              <Text style={s.section}>{sectionName} · Tüm zamanlar</Text>
              <View style={s.row}>
                <View style={s.stat}>
                  <Text style={s.statNumber}>
                    {mediaType === "movie" ? totals.movies : seriesCount}
                  </Text>
                  <Text style={s.muted}>
                    {mediaType === "movie" ? "film izleme" : "farklı dizi"}
                  </Text>
                </View>
                {mediaType === "tv" && (
                  <View style={s.stat}>
                    <Text style={s.statNumber}>{totals.episodes}</Text>
                    <Text style={s.muted}>bölüm izleme</Text>
                  </View>
                )}
              </View>
              <Text style={s.section}>{formatDuration(totals.minutes)}</Text>
              <Text style={s.muted}>
                {mediaType === "movie"
                  ? "Film izleme süren"
                  : "Dizi izleme süren"}{" "}
                · Tekrar izlemeler dahil
              </Text>
            </View>
            <View style={s.card}>
              <Avatar />
              <View style={s.rowBetween}>
                <Text style={s.section}>{avatar.username}</Text>
                <Text style={s.pill}>SEVİYE {progress.level}</Text>
              </View>
              <Text style={s.muted}>@{accountUsername}</Text>
              <Text style={s.lilac}>
                {progress.currentXp} XP · {progress.unlockedItemIds.length} eşya
                açık
              </Text>
              <Text style={s.muted}>
                Film ve dizi kayıtların aynı karakteri geliştirir.
              </Text>
              <Button
                label="Gardırobunu düzenle"
                secondary
                onPress={() => setModal("wardrobe")}
              />
            </View>
            <View style={s.card}>
              <Text style={s.section}>Hesap ve yedekleme</Text>
              <FirebaseAccount />
              <Button
                label="Tanıtımı tekrar gör"
                secondary
                onPress={() => useWelcome.getState().replay()}
              />
            </View>
            <View style={s.card}>
              <Text style={s.section}>Arkadaşların</Text>
              <Text style={s.muted}>
                Arkadaşlar ve ortak listeler yeni hesap sistemine hazırlanıyor.
              </Text>
            </View>
          </>
        )}
        <Text style={s.footer}>
          CINETRACK & AVATAR · HER HİKÂYE BİR İZ BIRAKIR
        </Text>
      </ScrollView>
      <View style={s.nav}>
        {tabs.map(([key, icon, label]) => (
          <Pressable
            accessibilityRole={key === "add" ? "button" : "tab"}
            accessibilityLabel={key === "add" ? "Film veya dizi ekle" : label}
            accessibilityState={
              key === "add" ? undefined : { selected: tab === key }
            }
            key={key}
            onPress={() => {
              if (key === "add") {
                setSelected(null);
                setQuery("");
                setError("");
                setModal("search");
              } else setTab(key);
            }}
            style={[s.navItem, key === "add" && s.addButton]}
          >
            <Ionicons
              name={icon}
              size={key === "add" ? 30 : 23}
              color={
                key === "add" ? "#201631" : tab === key ? "#b6a4ff" : "#777489"
              }
            />
            {key !== "add" && (
              <Text
                style={{
                  fontSize: 11,
                  color: tab === key ? "#c5b7ff" : "#8c889e",
                }}
              >
                {label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
      <Modal
        visible={modal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setModal(null);
            setSelected(null);
          }
        }}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.rowBetween}>
              <Text style={s.section}>
                {modal === "wardrobe"
                  ? "Gardırobun"
                  : modal === "media"
                    ? "Bölüm değiştir"
                    : selected
                      ? "İzleme kaydı"
                      : "Yeni bir hikâye bul"}
              </Text>
              <Pressable
                disabled={saving}
                accessibilityLabel="Kapat"
                onPress={() => {
                  setModal(null);
                  setSelected(null);
                  setError("");
                }}
              >
                <Ionicons name="close" color="white" size={27} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 18, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              {modal === "media" && (
                <>
                  <Text style={s.muted}>
                    Film ve dizi dünyaların arasında geçiş yap.
                  </Text>
                  {(["movie", "tv"] as const).map((type) => (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      accessibilityLabel={
                        type === "movie" ? "Filmler" : "Diziler"
                      }
                      accessibilityState={{ selected: mediaType === type }}
                      onPress={() => {
                        filter.setType(type);
                        setModal(null);
                      }}
                      style={[s.card, s.rowBetween]}
                    >
                      <View style={s.row}>
                        <Ionicons
                          name={
                            type === "movie" ? "film-outline" : "tv-outline"
                          }
                          size={27}
                          color="#c5b7ff"
                        />
                        <View>
                          <Text style={s.section}>
                            {type === "movie" ? "Filmler" : "Diziler"}
                          </Text>
                          <Text style={s.muted}>
                            {type === "movie"
                              ? "Beyaz perdedeki hikâyelerin"
                              : "Bölüm bölüm takip ettiklerin"}
                          </Text>
                        </View>
                      </View>
                      {mediaType === type && (
                        <Ionicons
                          name="checkmark-circle"
                          color="#b7a4fa"
                          size={25}
                        />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
              {modal === "wardrobe" && (
                <>
                  <Avatar />
                  <Text style={s.muted}>Temel karakterin</Text>
                  <View style={s.row}>
                    <Button
                      label="Sıcak ton"
                      secondary={avatar.body !== "warm"}
                      onPress={() => avatar.setBody("warm")}
                    />
                    <Button
                      label="Koyu ton"
                      secondary={avatar.body !== "deep"}
                      onPress={() => avatar.setBody("deep")}
                    />
                  </View>
                  {items.map((item) => {
                    const unlocked = progress.unlockedItemIds.includes(item.id);
                    const equipped =
                      avatar.equippedItems[item.category] === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        disabled={!unlocked}
                        onPress={() => avatar.equip(item.id)}
                        style={[
                          s.card,
                          {
                            opacity: unlocked ? 1 : 0.45,
                            borderColor: equipped ? "#ae98ff" : "#32303f",
                          },
                        ]}
                      >
                        <View style={s.rowBetween}>
                          <Text style={s.text}>{item.name}</Text>
                          <Text style={s.lilac}>
                            {equipped ? "✓ Giyili" : unlocked ? "Giy" : "🔒"}
                          </Text>
                        </View>
                        <Text style={s.muted}>
                          {item.milestone === "movies10"
                            ? "10 film izle"
                            : item.milestone === "hours100"
                              ? "100 saat izle"
                              : `${item.requiredXp} XP`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              )}
              {modal === "search" && !selected && (
                <>
                  <View style={s.row}>
                    {(["movie", "tv"] as const).map((type) => (
                      <Button
                        key={type}
                        label={type === "movie" ? "Filmler" : "Diziler"}
                        secondary={mediaType !== type}
                        onPress={() => filter.setType(type)}
                      />
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Film veya dizi ara"
                    placeholder={
                      mediaType === "movie" ? "Film ara…" : "Dizi ara…"
                    }
                    placeholderTextColor="#777489"
                    style={s.input}
                    value={query}
                    onChangeText={setQuery}
                  />
                  {demoMode && (
                    <Text style={s.muted}>
                      Örnek katalog · Canlı arama için TMDB anahtarı gerekli.
                    </Text>
                  )}
                  {loading && <ActivityIndicator color="#b6a4ff" />}
                  {!loading && !visibleResults.length && (
                    <Text style={s.muted}>Sonuç bulunamadı.</Text>
                  )}
                  {visibleResults.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => pick(m)}
                      style={[s.row, s.card]}
                    >
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w92${m.posterPath}`,
                        }}
                        style={{
                          width: 44,
                          height: 64,
                          borderRadius: 7,
                          backgroundColor: "#302b40",
                        }}
                      />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={s.text}>{m.title}</Text>
                        <Text style={s.muted}>
                          {m.releaseYear} ·{" "}
                          {m.type === "movie"
                            ? "Film · +50 XP"
                            : "Dizi bölümü · +15 XP"}
                        </Text>
                      </View>
                      <Ionicons
                        name="add-circle-outline"
                        color="#b6a4ff"
                        size={26}
                      />
                    </Pressable>
                  ))}
                </>
              )}
              {modal === "search" && selected && (
                <>
                  <Text style={s.subtitle}>{selected.title}</Text>
                  <View style={s.row}>
                    {(["month", "year"] as const).map((p) => {
                      const key =
                        p === "year"
                          ? String(currentYear)
                          : `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                      const exists = library.watchlist.some(
                        (e) =>
                          e.period === key && e.mediaItem.id === selected.id,
                      );
                      return (
                        <Button
                          key={p}
                          secondary
                          label={`${exists ? "✓" : "＋"} ${p === "month" ? "Bu ay" : "Bu yıl"}`}
                          onPress={() =>
                            library.toggleList({
                              mediaItem: selected,
                              period: key,
                            })
                          }
                        />
                      );
                    })}
                  </View>
                  <Text style={s.text}>Ne zaman izledin?</Text>
                  <DatePicker value={date} onChange={setDate} />
                  {selected.type === "tv" && (
                    <EpisodePicker
                      key={selected.id}
                      tmdbId={selected.tmdbId}
                      onChange={chooseEpisode}
                      disabled={saving}
                    />
                  )}
                  <Text style={s.muted}>Puanın · isteğe bağlı</Text>
                  <View style={s.row}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        accessibilityLabel={`${n} yıldız`}
                        onPress={() => setRating(rating === n ? undefined : n)}
                      >
                        <Ionicons
                          name={rating && n <= rating ? "star" : "star-outline"}
                          size={33}
                          color="#c4aeff"
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="İzleme notu"
                    placeholder="Sende nasıl bir iz bıraktı?"
                    placeholderTextColor="#777489"
                    value={review}
                    onChangeText={setReview}
                    multiline
                    maxLength={500}
                    style={[s.input, { minHeight: 80 }]}
                  />
                  <Text style={s.muted}>
                    Süre otomatik eklenir
                    {selected.runtimeMinutes > 0 && selected.type === "movie"
                      ? ` · ${selected.runtimeMinutes} dk`
                      : selected.type === "tv"
                        ? " · Seçtiğin bölümün süresi kullanılır"
                        : ""}
                    .
                  </Text>
                  <View style={s.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.text}>Tekrar izledim</Text>
                      <Text style={s.muted}>
                        Ayrı bir izleme olarak eklenir; toplam sürene dahil
                        edilir.
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Tekrar izledim"
                      value={isRewatch}
                      onValueChange={setIsRewatch}
                      trackColor={{ true: "#9477dd", false: "#40374d" }}
                    />
                  </View>
                  <Button
                    label={
                      saving
                        ? "Kaydediliyor…"
                        : `Aktiviteye ekle · +${selected.type === "movie" ? 50 : 15} XP`
                    }
                    onPress={save}
                    disabled={
                      saving || (selected.type === "tv" && !episodeReady)
                    }
                  />
                </>
              )}
              {error ? (
                <Text accessibilityRole="alert" style={{ color: "#ffaaa9" }}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101017" },
  header: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#272037",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontWeight: "800",
    fontSize: 23,
    letterSpacing: -1,
    color: "#f1eff9",
  },
  content: {
    padding: 24,
    gap: 24,
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#a9a0bc",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#f2effc",
    letterSpacing: -1,
    lineHeight: 42,
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 35,
    color: "#f2effc",
  },
  text: { fontSize: 14, color: "#e8e3f3", lineHeight: 22 },
  muted: { fontSize: 12, color: "#9992ac", lineHeight: 19 },
  lilac: { fontSize: 13, color: "#c0aaff", fontWeight: "600" },
  section: { fontSize: 17, fontWeight: "600", color: "#ede7fa" },
  hero: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#343043",
    backgroundColor: "#1c1928",
    borderRadius: 24,
  },
  heroSide: { flex: 1, minWidth: 230, justifyContent: "center", gap: 23 },
  pill: {
    fontSize: 10,
    fontWeight: "700",
    color: "#d0bcff",
    backgroundColor: "#34284e",
    padding: 8,
    borderRadius: 8,
  },
  track: {
    height: 6,
    backgroundColor: "#363144",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: { height: 6, backgroundColor: "#b5a0ff", borderRadius: 8 },
  button: {
    backgroundColor: "#b7a4fa",
    paddingHorizontal: 19,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#2b263d",
    borderWidth: 1,
    borderColor: "#423754",
  },
  buttonText: { fontSize: 13, fontWeight: "700", color: "#211834" },
  stat: { flex: 1, gap: 6 },
  statNumber: { fontSize: 31, color: "#eee8ff", fontWeight: "700" },
  poster: {
    width: 130,
    height: 184,
    borderRadius: 13,
    backgroundColor: "#292336",
  },
  card: {
    padding: 19,
    gap: 13,
    backgroundColor: "#1c1926",
    borderWidth: 1,
    borderColor: "#302a3e",
    borderRadius: 17,
  },
  input: {
    color: "#f3edf9",
    borderWidth: 1,
    borderColor: "#3d354d",
    backgroundColor: "#211c2d",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
  },
  footer: {
    textAlign: "center",
    color: "#615a72",
    fontSize: 9,
    letterSpacing: 1.4,
    paddingVertical: 18,
  },
  mediaSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#272037",
    padding: 11,
    borderRadius: 18,
  },
  addButton: {
    backgroundColor: "#b7a4fa",
    borderRadius: 20,
    width: 56,
    height: 56,
    minWidth: 56,
    flex: 0,
    justifyContent: "center",
    marginTop: -12,
  },
  nav: {
    flexDirection: "row",
    backgroundColor: "#17141f",
    borderTopWidth: 1,
    borderColor: "#2e273a",
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: "space-around",
  },
  navItem: { alignItems: "center", gap: 5, minWidth: 0, flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "#000a",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "93%",
    backgroundColor: "#191521",
    padding: 22,
    borderRadius: 24,
    gap: 24,
    borderWidth: 1,
    borderColor: "#3b314c",
  },
  notice: { backgroundColor: "#223d32", padding: 15, borderRadius: 12 },
});
