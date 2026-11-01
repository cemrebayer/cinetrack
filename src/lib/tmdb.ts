import { MediaItem, MediaType } from "../types";
import { catalog } from "./catalog";
import { storage } from "./storage";
const token = process.env.EXPO_PUBLIC_TMDB_TOKEN;
export const demoMode = !token;
export async function tmdbRequest(path: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok)
    throw new Error(`TMDB isteği başarısız (${response.status}).`);
  return response.json();
}
export async function searchMedia(
  query: string,
  signal?: AbortSignal,
): Promise<MediaItem[]> {
  if (!token)
    return catalog.filter((m) =>
      m.title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
    );
  const key = `search:${query.toLowerCase()}`;
  try {
    const data = await tmdbRequest(
      `/search/multi?language=tr-TR&query=${encodeURIComponent(query)}`,
      signal,
    );
    const results: MediaItem[] = data.results
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .map((r: any) => ({
        id: `${r.media_type}-${r.id}`,
        tmdbId: r.id,
        title: r.title ?? r.name,
        type: r.media_type,
        posterPath: r.poster_path ?? "",
        runtimeMinutes: 0,
        genres: [],
        releaseYear: Number(
          (r.release_date ?? r.first_air_date ?? "").slice(0, 4),
        ),
      }));
    storage.setItem(key, JSON.stringify(results));
    return results;
  } catch (error) {
    if (signal?.aborted) throw error;
    const cached = storage.getItem(key);
    if (cached) return JSON.parse(cached);
    throw error;
  }
}
export async function mediaDetails(
  media: MediaItem,
  season?: number,
  episode?: number,
): Promise<MediaItem> {
  if (!token) return { ...media };
  const path =
    media.type === "tv" && season !== undefined && episode !== undefined
      ? `/tv/${media.tmdbId}/season/${season}/episode/${episode}`
      : `/${media.type}/${media.tmdbId}`;
  const key = `detail:${path}`;
  try {
    const [detail, base] = await Promise.all([
      tmdbRequest(`${path}?language=tr-TR`),
      media.type === "tv"
        ? tmdbRequest(`/tv/${media.tmdbId}?language=tr-TR`)
        : Promise.resolve(null),
    ]);
    const result = {
      ...media,
      runtimeMinutes:
        detail.runtime > 0
          ? detail.runtime
          : (base?.episode_run_time?.find((minutes: number) => minutes > 0) ??
            0),
      genres: (base ?? detail).genres.map((g: { name: string }) => g.name),
    };
    storage.setItem(key, JSON.stringify(result));
    return result;
  } catch (error) {
    const cached = storage.getItem(key);
    if (cached) return JSON.parse(cached);
    throw error;
  }
}
