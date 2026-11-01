import { describe, it, expect } from "vitest";
import { daysUntil, favoriteGenres, recommend, weekKey } from "./discovery";
import { catalog } from "./catalog";
import { WatchLog } from "../types";
const log = (index: number, rating?: number): WatchLog => ({
  id: String(index),
  mediaItem: catalog[index],
  watchedAt: new Date(2026, 9, 5).toISOString(),
  rating,
});
describe("Keşfet önerileri ve tarihler", () => {
  it("hafta pazartesi başlar ve yıl sınırında doğru çalışır", () => {
    expect(weekKey(new Date(2026, 9, 6))).toBe("2026-10-05");
    expect(weekKey(new Date(2027, 0, 1))).toBe("2026-12-28");
  });
  it("yüksek puanlı türler öncelikli, düşük puanlılar tercihe eklenmez", () => {
    expect(favoriteGenres([log(0, 5), log(2, 1)])[0]).toBe("Bilim Kurgu");
    expect(favoriteGenres([log(2, 1)])).toEqual([]);
  });
  it("tekrar izlenen dizi bölümleri tür ağırlığını şişirmez", () => {
    expect(favoriteGenres([log(0, 5), log(0, 5)])).toEqual(
      favoriteGenres([log(0, 5)]),
    );
  });
  it("izlenenleri dışlar, seçili bölümle ve türlerle eşleştirir", () => {
    const result = recommend(catalog, [log(0, 5)], "movie", "2026-10-05");
    expect(result[0].title).toBe("Dune");
    expect(
      result.every((m) => m.type === "movie" && m.id !== catalog[0].id),
    ).toBe(true);
  });
  it("aynı haftanın seçkisi sabittir ve yinelenen aday içermez", () => {
    const result = recommend(
      [...catalog, ...catalog],
      [],
      "movie",
      "2026-10-05",
    );
    expect(result).toEqual(recommend(catalog, [], "movie", "2026-10-05"));
    expect(new Set(result.map((m) => m.id)).size).toBe(result.length);
  });
  it("geri sayım saatten etkilenmez, geçmiş ve belirsiz tarih ayrılır", () => {
    expect(daysUntil("2026-10-06", new Date(2026, 9, 6, 23, 59))).toBe(0);
    expect(daysUntil("2026-10-07", new Date(2026, 9, 6, 23, 59))).toBe(1);
    expect(daysUntil("2026-10-05", new Date(2026, 9, 6))).toBe(-1);
    expect(daysUntil("2026-02-30", new Date())).toBeNull();
    expect(daysUntil("", new Date())).toBeNull();
  });
});
