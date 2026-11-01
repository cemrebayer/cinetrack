import { describe, it, expect } from "vitest";
import { progression, recap, validateLog } from "./domain";
import { catalog } from "./catalog";
import { WatchLog } from "../types";
const log = (overrides: Partial<WatchLog> = {}): WatchLog => ({
  id: "1",
  mediaItem: catalog[0],
  watchedAt: new Date(2024, 5, 15, 12).toISOString(),
  ...overrides,
});
describe("İzleme ve ödül kuralları", () => {
  it("film ve bölüm XP değerleri doğru", () =>
    expect(progression([log(), log({ mediaItem: catalog[3] })]).currentXp).toBe(
      65,
    ));
  it("250 XP seviyeyi artırır ve kıyafet açar", () => {
    const p = progression(Array.from({ length: 5 }, () => log()));
    expect(p.level).toBe(2);
    expect(p.unlockedItemIds).toContain("outfit-mint");
  });
  it("10 film ve 100 saat farklı kilometre taşlarıdır", () => {
    expect(
      progression(Array.from({ length: 10 }, () => log())).unlockedItemIds,
    ).toContain("pin-popcorn");
    expect(
      progression([log({ mediaItem: { ...catalog[0], runtimeMinutes: 6000 } })])
        .unlockedItemIds,
    ).toContain("hat-crown");
  });
  it("geçmiş izleme yılıyla filtreler, dizileri tekil sayar", () => {
    const r = recap(
      [
        log(),
        log({ mediaItem: catalog[3] }),
        log({ mediaItem: catalog[3] }),
        log({ watchedAt: new Date(2023, 1, 1).toISOString() }),
      ],
      2024,
    );
    expect(r.movies).toBe(1);
    expect(r.series).toBe(1);
    expect(r.episodes).toBe(2);
    expect(r.minutes).toBe(263);
    expect(r.months[5]).toBe(3);
  });
  it("boş yıl güvenli", () => expect(recap([], 2020).minutes).toBe(0));
  it("gelecek tarih, geçersiz puan ve bölüm reddedilir", () => {
    expect(() => validateLog(log({ watchedAt: "2999-01-01" }))).toThrow();
    expect(() => validateLog(log({ rating: 6 }))).toThrow();
    expect(() =>
      validateLog(
        log({ mediaItem: catalog[3], seasonNumber: 1, episodeNumber: 0 }),
      ),
    ).toThrow();
  });
  it("kayıt silinince XP ve haklar geri hesaplanır", () => {
    expect(progression([]).currentXp).toBe(0);
    expect(progression([]).unlockedItemIds).not.toContain("hat-star");
  });
});
