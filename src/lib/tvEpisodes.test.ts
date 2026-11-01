import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  request: vi.fn(),
  cache: new Map<string, string>(),
}));
vi.mock("./tmdb", () => ({ tmdbRequest: mock.request, demoMode: false }));
vi.mock("./storage", () => ({
  storage: {
    getItem: (key: string) => mock.cache.get(key) ?? null,
    setItem: (key: string, value: string) => mock.cache.set(key, value),
  },
}));
import {
  parseSeasons,
  parseEpisodes,
  fetchSeasons,
  fetchEpisodes,
} from "./tvEpisodes";
describe("Dizi sezon ve bölüm seçenekleri", () => {
  beforeEach(() => {
    mock.request.mockReset();
    mock.cache.clear();
  });
  it("özel sezonu korur, boş sezonları çıkarır ve gerçek sezon numaralarını sıralar", () => {
    expect(
      parseSeasons({
        seasons: [
          { season_number: 3, episode_count: 8 },
          { season_number: 0, episode_count: 2 },
          { season_number: 1, episode_count: 0 },
        ],
      }).map((s) => s.number),
    ).toEqual([0, 3]);
  });
  it("bölüm sayısından sahte seçenek üretmez; adları ve numara boşluklarını korur", () => {
    const result = parseEpisodes({
      episodes: [
        { episode_number: 3, name: "Final", runtime: 48 },
        { episode_number: 1, name: "Pilot", runtime: null },
      ],
    });
    expect(result.map((e) => e.number)).toEqual([1, 3]);
    expect(result[0].runtime).toBeNull();
    expect(result[1].name).toBe("Final");
  });
  it("0 numaralı özel sezonu doğru uç noktadan ister", async () => {
    mock.request.mockResolvedValue({
      episodes: [{ episode_number: 1, name: "Özel" }],
    });
    await fetchEpisodes(1396, 0, new AbortController().signal);
    expect(mock.request.mock.calls[0][0]).toBe(
      "/tv/1396/season/0?language=tr-TR",
    );
  });
  it("ağ hatasında kayıtlı seçenekleri etiketleyerek döndürür", async () => {
    mock.request.mockResolvedValueOnce({
      seasons: [{ season_number: 1, episode_count: 7 }],
    });
    await fetchSeasons(1396, new AbortController().signal);
    mock.request.mockRejectedValueOnce(new Error("offline"));
    const result = await fetchSeasons(1396, new AbortController().signal);
    expect(result.cached).toBe(true);
    expect(result.items[0].episodeCount).toBe(7);
  });
  it("iptal edilmiş istek eski önbelleği yeni seçime taşımaz", async () => {
    const controller = new AbortController();
    controller.abort();
    mock.cache.set("tv-options:/tv/1396", "[]");
    mock.request.mockRejectedValue(new Error("aborted"));
    await expect(fetchSeasons(1396, controller.signal)).rejects.toThrow(
      "aborted",
    );
  });
});
