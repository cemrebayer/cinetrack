import { describe, it, expect } from "vitest";
import {
  logsForDay,
  lifetimeStats,
  formatDuration,
  logsForType,
} from "./watchHistory";
import { catalog } from "./catalog";
import { WatchLog } from "../types";
const entry = (
  id: string,
  date: Date,
  extra: Partial<WatchLog> = {},
): WatchLog => ({
  id,
  watchedAt: date.toISOString(),
  mediaItem: catalog[0],
  ...extra,
});
describe("İzleme takvimi ve profil", () => {
  it("takvimde kayıt ekleme sırası yerine ilk izlenen görünür", () => {
    const day = new Date(2026, 4, 3);
    const late = entry("late", new Date(2026, 4, 3, 21));
    const early = entry("early", new Date(2026, 4, 3, 9));
    expect(
      logsForDay([late, early, entry("other", new Date(2026, 4, 4))], day).map(
        (l) => l.id,
      ),
    ).toEqual(["early", "late"]);
  });
  it("aynı saatte eski kaydı önce gösterir", () => {
    const d = new Date(2026, 4, 3);
    expect(logsForDay([entry("new", d), entry("old", d)], d)[0].id).toBe("old");
  });
  it("gece yarısını yerel takvim gününe göre ayırır", () => {
    const d = new Date(2026, 4, 3);
    expect(
      logsForDay(
        [
          entry("before", new Date(2026, 4, 2, 23, 59)),
          entry("after", new Date(2026, 4, 3, 0, 1)),
        ],
        d,
      ).map((l) => l.id),
    ).toEqual(["after"]);
  });
  it("tekrar film ve bölüm izlemeleri toplam süreye eklenir, tüm yılları kapsar", () => {
    const stats = lifetimeStats([
      entry("1", new Date(2023, 0, 1)),
      entry("2", new Date(2026, 0, 1), { isRewatch: true }),
      entry("3", new Date(2026, 0, 1), { mediaItem: catalog[3] }),
      entry("4", new Date(2026, 0, 1), {
        mediaItem: catalog[3],
        isRewatch: true,
      }),
    ]);
    expect(stats).toEqual({ movies: 2, episodes: 2, minutes: 432 });
    expect(formatDuration(stats.minutes)).toBe("7 sa 12 dk");
  });
  it("boş profil ve gün güvenli", () => {
    expect(lifetimeStats([])).toEqual({ movies: 0, episodes: 0, minutes: 0 });
    expect(logsForDay([], new Date())).toEqual([]);
  });
});

describe("Film ve dizi bölümleri", () => {
  const day = new Date(2026, 9, 6);
  const movie = { ...catalog[0], type: "movie" as const, runtimeMinutes: 120 };
  const tv = { ...catalog[3], type: "tv" as const, runtimeMinutes: 45 };
  const mixed = [
    entry("movie", day, { mediaItem: movie }),
    entry("episode", day, { mediaItem: tv, seasonNumber: 1, episodeNumber: 1 }),
    entry("movie-repeat", day, { mediaItem: movie, isRewatch: true }),
    entry("episode-repeat", day, { mediaItem: tv, isRewatch: true }),
  ];
  it("filmlerde yalnızca film kayıtları ve tekrarlarının süresi hesaplanır", () => {
    const logs = logsForType(mixed, "movie");
    expect(logs.map((l) => l.id)).toEqual(["movie", "movie-repeat"]);
    expect(lifetimeStats(logs)).toEqual({
      movies: 2,
      episodes: 0,
      minutes: 240,
    });
    expect(
      logsForDay(logs, day).every((l) => l.mediaItem.type === "movie"),
    ).toBe(true);
  });
  it("dizilerde yalnızca bölüm kayıtları ve tekrarlarının süresi hesaplanır", () => {
    const logs = logsForType(mixed, "tv");
    expect(logs.map((l) => l.id)).toEqual(["episode", "episode-repeat"]);
    expect(lifetimeStats(logs)).toEqual({
      movies: 0,
      episodes: 2,
      minutes: 90,
    });
    expect(logsForDay(logs, day).every((l) => l.mediaItem.type === "tv")).toBe(
      true,
    );
  });
  it("diğer bölümde kayıt olsa bile boş bölümün süresi sıfırdır", () => {
    expect(lifetimeStats(logsForType([mixed[0]], "tv"))).toEqual({
      movies: 0,
      episodes: 0,
      minutes: 0,
    });
    expect(mixed).toHaveLength(4);
  });
});
