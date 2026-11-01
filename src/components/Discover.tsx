import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaType, WatchLog, WatchlistEntry } from "../types";
import { daysUntil, favoriteGenres, weekKey } from "../lib/discovery";
import { weeklyFeed, upcomingFeed, Feed } from "../lib/discoveryApi";
import { dayKey } from "../lib/watchHistory";
export function Discover({
  type,
  logs,
  watchlist,
  onToggle,
}: {
  type: MediaType;
  logs: WatchLog[];
  watchlist: WatchlistEntry[];
  onToggle: (entry: WatchlistEntry) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [retry, setRetry] = useState(0);
  const [weekly, setWeekly] = useState<Feed | null>(null);
  const [upcoming, setUpcoming] = useState<Feed | null>(null);
  const [errors, setErrors] = useState<{ weekly?: string; upcoming?: string }>(
    {},
  );
  const day = dayKey(now);
  const week = weekKey(now);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setWeekly(null);
    setUpcoming(null);
    setErrors({});
    weeklyFeed(type, logs, now, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setWeekly(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setErrors((e) => ({
            ...e,
            weekly:
              "Öneriler yüklenemedi. Bağlantını kontrol edip tekrar dene.",
          }));
      });
    upcomingFeed(type, now, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setUpcoming(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setErrors((e) => ({
            ...e,
            upcoming:
              "Çıkış takvimi yüklenemedi. Bağlantını kontrol edip tekrar dene.",
          }));
      });
    return () => controller.abort();
  }, [type, logs, day, week, retry]);
  const favorites = favoriteGenres(logs);
  const renderSection = (
    feed: Feed | null,
    error: string | undefined,
    isUpcoming: boolean,
  ) => (
    <View style={{ gap: 16 }}>
      {error ? (
        <>
          <Text style={s.muted}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((n) => n + 1)}
          >
            <Text style={s.link}>Tekrar dene</Text>
          </Pressable>
        </>
      ) : !feed ? (
        <ActivityIndicator color="#c1aaff" />
      ) : (
        <>
          {feed.demo && (
            <Text style={s.muted}>
              {isUpcoming
                ? "Canlı çıkış takvimi henüz bağlı değil. Doğrulanmış tarihler geldiğinde burada görünecek."
                : "Örnek katalogdan seçildi · Canlı öneriler henüz bağlı değil."}
            </Text>
          )}
          {feed.cached && (
            <Text style={s.muted}>Çevrimdışı · Son kaydedilen sonuçlar</Text>
          )}
          {!feed.items.length && !feed.demo && (
            <Text style={s.muted}>
              {isUpcoming
                ? "Önümüzdeki 90 gün için tarihli yapım bulunamadı."
                : "Bu hafta için izlenmemiş bir öneri bulunamadı."}
            </Text>
          )}
          {!feed.items.length && feed.demo && !isUpcoming && (
            <Text style={s.muted}>
              Örnek katalogdaki tüm yapımları izledin.
            </Text>
          )}
          {feed.items.map((media, index) => {
            const period = String(now.getFullYear());
            const added = watchlist.some(
              (e) => e.period === period && e.mediaItem.id === media.id,
            );
            const days = media.releaseDate
              ? daysUntil(media.releaseDate, now)
              : null;
            const matching = media.genres.find((g) => favorites.includes(g));
            return (
              <View
                key={media.id}
                style={[s.card, !isUpcoming && index === 0 && s.featured]}
              >
                <View style={s.row}>
                  {media.posterPath ? (
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w342${media.posterPath}`,
                      }}
                      style={s.poster}
                    />
                  ) : (
                    <View style={[s.poster, s.placeholder]}>
                      <Ionicons name="film-outline" color="#c1aaff" size={32} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 9 }}>
                    <Text style={s.tag}>
                      {isUpcoming
                        ? "YAKINDA"
                        : index === 0
                          ? "HAFTANIN SEÇİMİ"
                          : "SENİN İÇİN"}
                    </Text>
                    <Text style={s.title}>{media.title}</Text>
                    {isUpcoming ? (
                      <>
                        <Text style={s.countdown}>
                          {days === 0 ? "Bugün yayında" : `${days} gün kaldı`}
                        </Text>
                        <Text style={s.muted}>
                          {media.releaseDate?.split("-").reverse().join(".")}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.muted}>
                          {media.releaseYear || "Tarih belirtilmemiş"} ·{" "}
                          {type === "movie" ? "Film" : "Dizi"}
                        </Text>
                        <Text style={s.muted}>
                          {matching
                            ? `${matching} izlemelerine ve puanlarına göre`
                            : logs.length
                              ? "İzlemediğin yapımlar arasından seçildi"
                              : "Başlamak için haftalık keşif seçkisi"}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${media.title}: ${added ? "yıllık listeden çıkar" : "yıllık listeye ekle"}`}
                  onPress={() => onToggle({ mediaItem: media, period })}
                  style={s.button}
                >
                  <Ionicons
                    name={added ? "checkmark" : "add"}
                    size={18}
                    color="#d7c5ff"
                  />
                  <Text style={s.link}>
                    {added ? "Yıllık listende" : "Bu yıl izleneceklere ekle"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 10 }}>
        <Text style={s.tag}>HER HAFTA YENİ BİR KEŞİF</Text>
        <Text style={s.heading}>Bu hafta senin için</Text>
        <Text style={s.muted}>
          {type === "movie" ? "Film" : "Dizi"} önerileri ·{" "}
          {week.split("-").reverse().join(".")} haftası
        </Text>
        <Text style={s.muted}>
          İzlediklerin ve özellikle 4–5 yıldız verdiğin türler önerilerini
          şekillendirir.
        </Text>
      </View>
      {renderSection(weekly, errors.weekly, false)}
      <View style={{ gap: 8 }}>
        <Text style={s.heading}>Yakında çıkacaklar</Text>
        <Text style={s.muted}>
          {type === "movie"
            ? "Filmlerin ilk çıkış tarihleri"
            : "Dizilerin ilk yayın tarihleri"}{" "}
          · Önümüzdeki 90 gün. Ülkeye göre değişebilir.
        </Text>
      </View>
      {renderSection(upcoming, errors.upcoming, true)}
    </View>
  );
}
const s = StyleSheet.create({
  heading: { fontSize: 28, fontWeight: "800", color: "#f0eaf8" },
  title: { fontSize: 19, fontWeight: "700", color: "#f0eaf8" },
  tag: {
    fontSize: 10,
    letterSpacing: 1.7,
    fontWeight: "700",
    color: "#bb9eee",
  },
  muted: { fontSize: 12, lineHeight: 19, color: "#a59ab5" },
  link: { fontSize: 13, fontWeight: "600", color: "#d7c5ff" },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#342c43",
    backgroundColor: "#1c1726",
    padding: 18,
    gap: 17,
  },
  featured: { backgroundColor: "#2b2140", borderColor: "#655080" },
  row: { flexDirection: "row", gap: 16, alignItems: "center" },
  poster: {
    width: 90,
    height: 132,
    borderRadius: 12,
    backgroundColor: "#362c45",
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  countdown: { fontSize: 19, color: "#c6e2a5", fontWeight: "700" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff08",
  },
});
