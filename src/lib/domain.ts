import { WatchLog } from "../types";
import { items } from "./catalog";
export function progression(logs: WatchLog[]) {
  const xp = logs.reduce(
    (sum, l) => sum + (l.mediaItem.type === "movie" ? 50 : 15),
    0,
  );
  const movies = logs.filter((l) => l.mediaItem.type === "movie").length;
  const minutes = logs.reduce((sum, l) => sum + l.mediaItem.runtimeMinutes, 0);
  return {
    currentXp: xp,
    level: Math.floor(xp / 250) + 1,
    unlockedItemIds: items
      .filter((i) =>
        i.milestone === "movies10"
          ? movies >= 10
          : i.milestone === "hours100"
            ? minutes >= 6000
            : xp >= i.requiredXp,
      )
      .map((i) => i.id),
  };
}
export function recap(logs: WatchLog[], year: number) {
  const selected = logs.filter(
    (l) => new Date(l.watchedAt).getFullYear() === year,
  );
  const genres: Record<string, number> = {};
  const months = Array<number>(12).fill(0);
  selected.forEach((l) => {
    months[new Date(l.watchedAt).getMonth()]++;
    l.mediaItem.genres.forEach((g) => (genres[g] = (genres[g] ?? 0) + 1));
  });
  return {
    total: selected.length,
    movies: selected.filter((l) => l.mediaItem.type === "movie").length,
    episodes: selected.filter((l) => l.mediaItem.type === "tv").length,
    series: new Set(
      selected
        .filter((l) => l.mediaItem.type === "tv")
        .map((l) => l.mediaItem.id),
    ).size,
    minutes: selected.reduce((s, l) => s + l.mediaItem.runtimeMinutes, 0),
    genres: Object.entries(genres).sort((a, b) => b[1] - a[1]),
    months,
  };
}
export function validateLog(log: WatchLog) {
  if (
    !Number.isFinite(Date.parse(log.watchedAt)) ||
    new Date(log.watchedAt) > new Date()
  )
    throw new Error(
      "Geçerli bir izleme tarihi seçin; gelecek tarih kullanılamaz.",
    );
  if (
    log.rating !== undefined &&
    (!Number.isInteger(log.rating) || log.rating < 1 || log.rating > 5)
  )
    throw new Error("Puan 1–5 arasında olmalı.");
  if (
    log.mediaItem.type === "tv" &&
    (!Number.isInteger(log.seasonNumber) ||
      log.seasonNumber! < 0 ||
      !Number.isInteger(log.episodeNumber) ||
      log.episodeNumber! < 1)
  )
    throw new Error("Sezon sıfır veya pozitif, bölüm pozitif tam sayı olmalı.");
  if (
    !Number.isFinite(log.mediaItem.runtimeMinutes) ||
    log.mediaItem.runtimeMinutes <= 0
  )
    throw new Error("Süre pozitif olmalı.");
}
