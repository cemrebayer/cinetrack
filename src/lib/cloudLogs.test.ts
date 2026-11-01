import { describe, it, expect, vi } from "vitest";
import { Timestamp } from "firebase/firestore";
vi.mock("./firebase", () => ({ requireFirebase: vi.fn() }));
import { encodeLog, decodeLog } from "./cloudLogs";
import { catalog } from "./catalog";
describe("Firestore izleme verileri", () => {
  it("panelden oluşturulan sade kaydı uygulama modeline çevirir", () => {
    const d = {
      mediaType: "movie",
      tmdbId: 157336,
      title: "Interstellar",
      runtimeMinutes: 169,
      watchedAt: Timestamp.fromDate(new Date("2026-10-01")),
      createdAt: Timestamp.fromDate(new Date("2026-10-02")),
      isRewatch: false,
    };
    const log = decodeLog("panel-id", d);
    expect(log.mediaItem.id).toBe("movie-157336");
    expect(log.mediaItem.genres).toEqual([]);
    expect(log.watchedAt).toBe("2026-10-01T00:00:00.000Z");
  });
  it("bölüm, puan ve tekrar bilgisi kayıpsız çevrilir", () => {
    const log = {
      id: "repeat",
      mediaItem: catalog.find((m) => m.type === "tv")!,
      watchedAt: "2026-10-01T12:00:00.000Z",
      createdAt: "2026-10-02T12:00:00.000Z",
      isRewatch: true,
      seasonNumber: 1,
      episodeNumber: 2,
      rating: 5,
      review: "Güzel",
    };
    expect(decodeLog(log.id, encodeLog(log))).toEqual(log);
  });
  it("geçersiz tarihlerle bozuk kaydı sessizce saymaz", () => {
    expect(() => decodeLog("bad", { watchedAt: "yesterday" })).toThrow();
  });
});
