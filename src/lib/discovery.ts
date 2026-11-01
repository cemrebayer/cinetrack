import { MediaItem, MediaType, WatchLog } from "../types";
import { dayKey } from "./watchHistory";
export interface DiscoveryItem extends MediaItem {
  releaseDate?: string;
}
export function weekKey(now: Date) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dayKey(monday);
}
export function favoriteGenres(logs: WatchLog[]) {
  const latest = new Map<string, WatchLog>();
  [...logs]
    .sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt))
    .forEach((l) => {
      if (!latest.has(l.mediaItem.id)) latest.set(l.mediaItem.id, l);
    });
  const weights = new Map<string, number>();
  latest.forEach((l) =>
    l.mediaItem.genres.forEach((g) =>
      weights.set(
        g,
        (weights.get(g) ?? 0) +
          (l.rating === undefined
            ? 1
            : l.rating >= 4
              ? l.rating
              : l.rating <= 2
                ? -2
                : 1),
      ),
    ),
  );
  return [...weights]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
}
function hash(value: string) {
  let seed = [...value].reduce(
    (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0,
    0,
  );
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return (seed ^ (seed >>> 16)) >>> 0;
}
export function recommend(
  candidates: DiscoveryItem[],
  logs: WatchLog[],
  type: MediaType,
  week: string,
) {
  const watched = new Set(logs.map((l) => l.mediaItem.id));
  const genres = favoriteGenres(logs);
  const unique = [...new Map(candidates.map((m) => [m.id, m])).values()];
  const score = (m: DiscoveryItem) =>
    m.genres.reduce(
      (n, g) =>
        n + (genres.includes(g) ? Math.max(1, 5 - genres.indexOf(g)) : 0),
      0,
    );
  return unique
    .filter((m) => m.type === type && !watched.has(m.id))
    .sort(
      (a, b) => score(b) - score(a) || hash(week + a.id) - hash(week + b.id),
    )
    .slice(0, 6);
}
export function daysUntil(date: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  if (
    target.getUTCFullYear() !== y ||
    target.getUTCMonth() !== m - 1 ||
    target.getUTCDate() !== d
  )
    return null;
  return Math.round(
    (target.getTime() -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
}
