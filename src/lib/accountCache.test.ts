import { beforeEach, describe, expect, it, vi } from "vitest";
const entries = vi.hoisted(() => new Map<string, string>());
vi.mock("./storage", () => ({
  storage: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  },
}));
import { bindAccountCache } from "./accountCache";
import { useLibrary, useAvatar } from "../store";
import { useLists } from "../store/lists";
describe("Hesapların cihaz verileri", () => {
  beforeEach(() => {
    entries.clear();
    bindAccountCache(null);
  });
  it("başka hesapta öncekinin listeleri, hedefleri ve avatarı görünmez", () => {
    bindAccountCache("first");
    useLibrary.getState().setGoal(2026, 70);
    useLists.getState().create("İlk kullanıcının listesi");
    useAvatar.getState().setBody("deep");
    bindAccountCache("second");
    expect(useLibrary.getState().goals).toEqual({});
    expect(useLists.getState().lists).toEqual([]);
    expect(useAvatar.getState().body).toBe("warm");
    bindAccountCache("first");
    expect(useLibrary.getState().goals[2026]).toBe(70);
    expect(useLists.getState().lists[0].name).toBe("İlk kullanıcının listesi");
    expect(useAvatar.getState().body).toBe("deep");
  });
  it("eski cihaz verilerini otomatik yüklemez veya silmez", () => {
    entries.set(
      "cinetrack-library",
      '{"state":{"logs":[],"goals":{"2026":99}}}',
    );
    bindAccountCache("new");
    expect(useLibrary.getState().goals).toEqual({});
    expect(entries.get("cinetrack-library")).toContain("99");
    bindAccountCache(null);
    expect(useLists.getState().lists).toEqual([]);
  });
});
