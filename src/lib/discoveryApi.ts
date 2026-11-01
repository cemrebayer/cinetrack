import { MediaType, WatchLog } from "../types";
import { catalog } from "./catalog";
import { storage } from "./storage";
import { dayKey } from "./watchHistory";
import {
  daysUntil,
  DiscoveryItem,
  favoriteGenres,
  recommend,
  weekKey,
} from "./discovery";
import { demoMode, tmdbRequest } from "./tmdb";
interface TmdbEntry {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}
export interface Feed {
  items: DiscoveryItem[];
  cached: boolean;
  demo: boolean;
}
async function cachedRequest(
  path: string,
  key: string,
  signal: AbortSignal,
  preferCache = false,
): Promise<{
  results: TmdbEntry[];
  cached: boolean;
  genres?: { id: number; name: string }[];
}> {
  if (preferCache) {
    const saved = storage.getItem(key);
    if (saved) return { ...JSON.parse(saved), cached: false };
  }
  try {
    const data = await tmdbRequest(path, signal);
    storage.setItem(key, JSON.stringify(data));
    return { ...data, cached: false };
  } catch (error) {
    if (signal.aborted) throw error;
    const value = storage.getItem(key);
    if (value) return { ...JSON.parse(value), cached: true };
    throw error;
  }
}
function mapItem(
  r: TmdbEntry,
  type: MediaType,
  genres: { id: number; name: string }[] = [],
): DiscoveryItem {
  const date = r.release_date ?? r.first_air_date;
  return {
    id: `${type}-${r.id}`,
    tmdbId: r.id,
    title: r.title ?? r.name ?? "İsimsiz yapım",
    type,
    posterPath: r.poster_path ?? "",
    runtimeMinutes: 0,
    genres: genres
      .filter((g) => r.genre_ids?.includes(g.id))
      .map((g) => g.name),
    releaseYear: Number(date?.slice(0, 4) ?? 0),
    releaseDate: date,
  };
}
export async function weeklyFeed(
  type: MediaType,
  logs: WatchLog[],
  now: Date,
  signal: AbortSignal,
): Promise<Feed> {
  const week = weekKey(now);
  if (demoMode)
    return {
      items: recommend(catalog, logs, type, week),
      cached: false,
      demo: true,
    };
  const genreData = await cachedRequest(
    `/genre/${type}/list?language=tr-TR`,
    `genres:${type}`,
    signal,
  );
  const genres = genreData.genres ?? [];
  const preferred = favoriteGenres(logs).slice(0, 3);
  const ids = genres.filter((g) => preferred.includes(g.name)).map((g) => g.id);
  const dateFilter =
    type === "movie" ? "primary_release_date.lte" : "first_air_date.lte";
  const path = `/discover/${type}?language=tr-TR&include_adult=false&sort_by=popularity.desc&vote_count.gte=30&${dateFilter}=${dayKey(now)}${ids.length ? `&with_genres=${ids.join("|")}` : ""}`;
  const data = await cachedRequest(
    path,
    `weekly:${week}:${type}:${ids.join(",")}`,
    signal,
    true,
  );
  return {
    items: recommend(
      data.results.map((r) => mapItem(r, type, genres)),
      logs,
      type,
      week,
    ),
    cached: data.cached || genreData.cached,
    demo: false,
  };
}
export async function upcomingFeed(
  type: MediaType,
  now: Date,
  signal: AbortSignal,
): Promise<Feed> {
  if (demoMode) return { items: [], cached: false, demo: true };
  const start = dayKey(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  const field = type === "movie" ? "primary_release_date" : "first_air_date";
  const data = await cachedRequest(
    `/discover/${type}?language=tr-TR&include_adult=false&sort_by=${field}.asc&${field}.gte=${start}&${field}.lte=${dayKey(end)}`,
    `upcoming:${type}:${start}`,
    signal,
  );
  return {
    items: data.results
      .map((r) => mapItem(r, type))
      .filter((m) => {
        const days = daysUntil(m.releaseDate ?? "", now);
        return days !== null && days >= 0 && days <= 90;
      })
      .sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!)),
    cached: data.cached,
    demo: false,
  };
}
