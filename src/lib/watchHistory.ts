import { MediaType, WatchLog } from "../types";
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function logsForDay(logs: WatchLog[], day: Date) {
  return logs
    .map((log, index) => ({ log, index }))
    .filter(({ log }) => dayKey(new Date(log.watchedAt)) === dayKey(day))
    .sort(
      (a, b) =>
        Date.parse(a.log.watchedAt) - Date.parse(b.log.watchedAt) ||
        (a.log.createdAt && b.log.createdAt
          ? Date.parse(a.log.createdAt) - Date.parse(b.log.createdAt)
          : b.index - a.index),
    )
    .map(({ log }) => log);
}
export function logsForType(logs: WatchLog[], type: MediaType) {
  return logs.filter((log) => log.mediaItem.type === type);
}
export function lifetimeStats(logs: WatchLog[]) {
  return {
    movies: logs.filter((l) => l.mediaItem.type === "movie").length,
    episodes: logs.filter((l) => l.mediaItem.type === "tv").length,
    minutes: logs.reduce((sum, l) => sum + l.mediaItem.runtimeMinutes, 0),
  };
}
export function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
}
