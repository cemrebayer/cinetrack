import { tmdbRequest, demoMode } from "./tmdb";
import { storage } from "./storage";
export interface SeasonOption {
  number: number;
  name: string;
  episodeCount: number;
}
export interface EpisodeOption {
  number: number;
  name: string;
  runtime: number | null;
}
export interface EpisodeSelection {
  seasonNumber: number;
  episodeNumber: number;
  runtime: number | null;
}
export function parseSeasons(data: {
  seasons?: Array<{
    season_number: number;
    name?: string;
    episode_count: number;
  }>;
}): SeasonOption[] {
  return (data.seasons ?? [])
    .filter(
      (s) =>
        Number.isInteger(s.season_number) &&
        s.season_number >= 0 &&
        s.episode_count > 0,
    )
    .map((s) => ({
      number: s.season_number,
      name:
        s.name ||
        (s.season_number === 0 ? "Özel bölümler" : `${s.season_number}. Sezon`),
      episodeCount: s.episode_count,
    }))
    .sort((a, b) => a.number - b.number);
}
export function parseEpisodes(data: {
  episodes?: Array<{
    episode_number: number;
    name?: string;
    runtime?: number | null;
  }>;
}): EpisodeOption[] {
  return (data.episodes ?? [])
    .filter((e) => Number.isInteger(e.episode_number) && e.episode_number > 0)
    .map((e) => ({
      number: e.episode_number,
      name: e.name || `${e.episode_number}. Bölüm`,
      runtime:
        typeof e.runtime === "number" && e.runtime > 0 ? e.runtime : null,
    }))
    .sort((a, b) => a.number - b.number);
}
async function load<T>(
  path: string,
  parse: (data: any) => T[],
  signal: AbortSignal,
): Promise<{ items: T[]; cached: boolean }> {
  const key = `tv-options:${path}`;
  if (demoMode)
    throw new Error(
      "Sezon ve bölüm seçimi için canlı katalog bağlantısı gerekiyor.",
    );
  try {
    const items = parse(await tmdbRequest(`${path}?language=tr-TR`, signal));
    if (signal.aborted) throw new Error("İstek iptal edildi.");
    storage.setItem(key, JSON.stringify(items));
    return { items, cached: false };
  } catch (error) {
    if (signal.aborted) throw error;
    const saved = storage.getItem(key);
    if (saved) return { items: JSON.parse(saved), cached: true };
    throw error;
  }
}
export const fetchSeasons = (id: number, signal: AbortSignal) =>
  load(`/tv/${id}`, parseSeasons, signal);
export const fetchEpisodes = (
  id: number,
  season: number,
  signal: AbortSignal,
) => load(`/tv/${id}/season/${season}`, parseEpisodes, signal);
