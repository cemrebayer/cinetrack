import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchSeasons,
  fetchEpisodes,
  SeasonOption,
  EpisodeOption,
  EpisodeSelection,
} from "../lib/tvEpisodes";
export function EpisodePicker({
  tmdbId,
  onChange,
  disabled,
}: {
  tmdbId: number;
  onChange: (selection: EpisodeSelection | null) => void;
  disabled: boolean;
}) {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [open, setOpen] = useState<"season" | "episode" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [seasonCached, setSeasonCached] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    onChange(null);
    setLoading(true);
    setError("");
    setSeasons([]);
    setEpisodes([]);
    setSeason(null);
    setEpisode(null);
    setOpen(null);
    setSeasonCached(false);
    fetchSeasons(tmdbId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSeasons(result.items);
        setSeasonCached(result.cached);
        const first = result.items.find((s) => s.number > 0) ?? result.items[0];
        if (first) setSeason(first.number);
        else {
          setLoading(false);
          setError("Bu dizinin bölüm bilgisi henüz bulunmuyor.");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(e instanceof Error ? e.message : "Sezonlar yüklenemedi.");
        }
      });
    return () => controller.abort();
  }, [tmdbId, retry, onChange]);
  useEffect(() => {
    if (season === null) return;
    const controller = new AbortController();
    onChange(null);
    setEpisodes([]);
    setEpisode(null);
    setLoading(true);
    setError("");
    setCached(false);
    fetchEpisodes(tmdbId, season, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setEpisodes(result.items);
        setCached(result.cached);
        setLoading(false);
        if (!result.items.length)
          setError(
            "Bu sezon için bölüm bilgisi bulunamadı. Başka bir sezon seçebilirsin.",
          );
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(e instanceof Error ? e.message : "Bölümler yüklenemedi.");
        }
      });
    return () => controller.abort();
  }, [tmdbId, season, retry, onChange]);
  const seasonItem = seasons.find((s) => s.number === season);
  const episodeItem = episodes.find((e) => e.number === episode);
  const control = (
    kind: "season" | "episode",
    label: string,
    value: string,
    locked: boolean,
  ) => (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open === kind, disabled: locked }}
        disabled={locked}
        style={[s.control, locked && { opacity: 0.45 }]}
        onPress={() => setOpen(open === kind ? null : kind)}
      >
        <Text style={[s.value, { flex: 1 }]}>{value}</Text>
        <Ionicons
          name={open === kind ? "chevron-up" : "chevron-down"}
          size={18}
          color="#c6b2ee"
        />
      </Pressable>
    </View>
  );
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Ionicons name="tv-outline" color="#c7adff" size={20} />
        <Text style={s.heading}>Hangi bölümü izledin?</Text>
      </View>
      {seasons.length > 0 && (
        <Text style={s.label}>
          {seasons.filter((s) => s.number > 0).length} sezon ·{" "}
          {seasons.reduce((sum, s) => sum + s.episodeCount, 0)} bölüm
          {seasons.some((s) => s.number === 0) ? " (özel bölümler dahil)" : ""}
        </Text>
      )}
      {control(
        "season",
        "Sezon",
        seasonItem
          ? `${seasonItem.name} · ${seasonItem.episodeCount} bölüm`
          : "Sezonlar yükleniyor…",
        disabled || !seasons.length,
      )}
      {open === "season" && (
        <ScrollView
          nestedScrollEnabled
          style={s.menu}
          keyboardShouldPersistTaps="handled"
        >
          {seasons.map((item) => (
            <Pressable
              key={item.number}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: season === item.number }}
              style={[s.option, season === item.number && s.selected]}
              onPress={() => {
                if (item.number !== season) {
                  onChange(null);
                  setEpisode(null);
                  setEpisodes([]);
                  setLoading(true);
                  setSeason(item.number);
                }
                setOpen(null);
              }}
            >
              <Text style={s.value}>{item.name}</Text>
              <Text style={s.label}>
                {item.episodeCount} bölüm {season === item.number ? "✓" : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {control(
        "episode",
        "Bölüm",
        episodeItem
          ? `${episodeItem.number}. Bölüm · ${episodeItem.name}`
          : loading
            ? "Bölümler yükleniyor…"
            : "Bölüm seç",
        disabled || loading || !episodes.length,
      )}
      {open === "episode" && (
        <ScrollView
          nestedScrollEnabled
          style={s.menu}
          keyboardShouldPersistTaps="handled"
        >
          {episodes.map((item) => (
            <Pressable
              key={item.number}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: episode === item.number }}
              style={[s.option, episode === item.number && s.selected]}
              onPress={() => {
                setEpisode(item.number);
                setOpen(null);
                onChange({
                  seasonNumber: season!,
                  episodeNumber: item.number,
                  runtime: item.runtime,
                });
              }}
            >
              <Text style={s.value}>
                {item.number}. Bölüm · {item.name}
              </Text>
              <Text style={s.label}>
                {item.runtime
                  ? `${item.runtime} dk`
                  : "Süre kayıt sırasında alınacak"}{" "}
                {episode === item.number ? "✓" : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {loading && <ActivityIndicator color="#baa3fa" />}
      {episodeItem?.runtime && (
        <Text style={s.label}>
          Seçilen bölüm · {episodeItem.runtime} dakika
        </Text>
      )}
      {(cached || seasonCached) && (
        <Text style={s.label}>Kaydedilmiş katalog bilgisi gösteriliyor.</Text>
      )}
      {!!error && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            onPress={() => setRetry((n) => n + 1)}
          >
            <Text style={s.value}>Tekrar dene</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#211a2d",
    borderWidth: 1,
    borderColor: "#3f3153",
  },
  row: { flexDirection: "row", gap: 9, alignItems: "center" },
  heading: { color: "#eee5fa", fontSize: 15, fontWeight: "600" },
  label: { color: "#aaa0bb", fontSize: 12, lineHeight: 19 },
  value: { color: "#e5d6ff", fontSize: 14, lineHeight: 22 },
  control: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#514065",
    borderRadius: 12,
    backgroundColor: "#2c223a",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menu: { maxHeight: 220, borderRadius: 12, backgroundColor: "#19131f" },
  option: { padding: 14, gap: 4, borderBottomWidth: 1, borderColor: "#34263f" },
  selected: { backgroundColor: "#3b2c50" },
  error: { color: "#ffb0bd", fontSize: 13, lineHeight: 20 },
});
