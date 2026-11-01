import { describe, it, expect } from "vitest";
import { addListItem, listName, listShareText, goalPercent } from "./lists";
import { catalog } from "./catalog";
describe("Kişisel listeler", () => {
  it("boş adları reddeder ve boşlukları temizler", () => {
    expect(() => listName("  ")).toThrow();
    expect(listName("  Hafta sonu  ")).toBe("Hafta sonu");
  });
  it("film ve diziyi birlikte tutar, aynı yapımı tekrar eklemez", () => {
    const film = catalog.find((m) => m.type === "movie")!;
    const tv = catalog.find((m) => m.type === "tv")!;
    const items = addListItem(addListItem([], film), tv);
    expect(addListItem(items, film)).toEqual([film, tv]);
    expect(listShareText({ id: "test", name: "Favoriler", items })).toContain(
      "(Dizi)",
    );
  });
  it("bin yapımdan sonra da eklemeye devam eder", () => {
    const items = Array.from({ length: 1100 }, (_, i) => ({
      ...catalog[0],
      id: `movie-${i}`,
    }));
    expect(
      addListItem(items, { ...catalog[0], id: "movie-extra" }),
    ).toHaveLength(1101);
  });
  it("hedef yüzdesini ve hedef aşımını hesaplar", () => {
    expect(goalPercent(12, 50)).toBe(24);
    expect(goalPercent(60, 50)).toBe(120);
    expect(goalPercent(1, 0)).toBe(0);
  });
});
