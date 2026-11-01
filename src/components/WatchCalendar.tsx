import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WatchLog } from "../types";
import { dayKey, logsForDay, formatDuration } from "../lib/watchHistory";
export function WatchCalendar({
  logs,
  label,
}: {
  logs: WatchLog[];
  label: string;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date | null>(null);
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const selectedLogs = selected ? logsForDay(logs, selected) : [];
  return (
    <View style={s.container}>
      <Text style={s.title}>{label} takvimin</Text>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Takvim önceki ay"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          style={s.arrow}
        >
          <Ionicons name="chevron-back" size={23} color="#c7b6ff" />
        </Pressable>
        <Text style={s.month}>
          {month.toLocaleDateString("tr-TR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Takvim sonraki ay"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          style={s.arrow}
        >
          <Ionicons name="chevron-forward" size={23} color="#c7b6ff" />
        </Pressable>
      </View>
      <View style={s.grid}>
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <Text key={d} style={s.weekday}>
            {d}
          </Text>
        ))}
        {Array.from({ length: Math.ceil((count + offset) / 7) * 7 }, (_, i) => {
          const day = i - offset + 1;
          if (day < 1 || day > count) return <View key={i} style={s.cell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const entries = logsForDay(logs, date);
          const first = entries[0];
          const today = dayKey(date) === dayKey(new Date());
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString("tr-TR")}, ${entries.length} izleme${first ? `, ${first.mediaItem.title}` : ""}`}
              onPress={() => setSelected(date)}
              style={s.cell}
            >
              <View style={[s.day, today && s.today]}>
                {first?.mediaItem.posterPath ? (
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w185${first.mediaItem.posterPath}`,
                    }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : first ? (
                  <Ionicons name="film-outline" color="#aa99cb" size={24} />
                ) : null}
                <Text style={[s.number, !!first && s.numberOverlay]}>
                  {day}
                </Text>
                {entries.length > 1 && (
                  <Text style={s.more}>+{entries.length - 1}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>
        Günün ilk izlediğin yapımı. Diğerleri için güne dokun.
      </Text>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.header}>
              <Text style={s.title}>
                {selected?.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gün detayını kapat"
                onPress={() => setSelected(null)}
                style={s.arrow}
              >
                <Ionicons name="close" color="white" size={26} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 20 }}>
              {!selectedLogs.length ? (
                <Text style={s.hint}>Bu gün için henüz izleme kaydı yok.</Text>
              ) : (
                <>
                  <Text style={s.hint}>
                    {selectedLogs.length} izleme ·{" "}
                    {formatDuration(
                      selectedLogs.reduce(
                        (sum, l) => sum + l.mediaItem.runtimeMinutes,
                        0,
                      ),
                    )}
                  </Text>
                  {selectedLogs.map((l) => (
                    <View key={l.id} style={s.entry}>
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w185${l.mediaItem.posterPath}`,
                        }}
                        style={s.poster}
                      />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={s.month}>{l.mediaItem.title}</Text>
                        <Text style={s.hint}>
                          {l.mediaItem.type === "tv"
                            ? `S${l.seasonNumber} · B${l.episodeNumber} · `
                            : ""}
                          {l.mediaItem.runtimeMinutes} dk
                          {l.isRewatch ? " · Tekrar izleme" : ""}
                        </Text>
                        {l.rating && (
                          <Text style={{ color: "#c7b6ff" }}>
                            {"★".repeat(l.rating)}
                          </Text>
                        )}
                        {l.review && <Text style={s.hint}>{l.review}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 21, color: "#eee8f8", fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  month: { fontSize: 15, color: "#eee8f8", fontWeight: "600" },
  arrow: { padding: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    color: "#9a92a7",
    fontSize: 11,
    paddingBottom: 12,
  },
  cell: { width: "14.2857%", padding: 3, aspectRatio: 0.73 },
  day: {
    flex: 1,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#1d1826",
    alignItems: "center",
    justifyContent: "center",
  },
  today: { borderWidth: 2, borderColor: "#baa5ff" },
  number: { fontSize: 13, fontWeight: "700", color: "#e8e2ef" },
  numberOverlay: {
    position: "absolute",
    top: 3,
    left: 3,
    backgroundColor: "#100e1baa",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  more: {
    position: "absolute",
    bottom: 3,
    right: 3,
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    padding: 3,
    borderRadius: 5,
    backgroundColor: "#594481",
  },
  hint: { fontSize: 12, lineHeight: 19, color: "#a59aad" },
  overlay: {
    flex: 1,
    backgroundColor: "#000b",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "#191521",
    padding: 20,
    borderRadius: 24,
    maxHeight: "85%",
    gap: 20,
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
  },
  entry: { flexDirection: "row", gap: 14, alignItems: "center" },
  poster: {
    width: 62,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#30283e",
  },
});
