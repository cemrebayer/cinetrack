import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MediaType, UserProfile, WatchLog, WatchlistEntry } from "../types";
import { storage } from "../lib/storage";
import { progression, validateLog } from "../lib/domain";
import { items } from "../lib/catalog";
interface Library {
  logs: WatchLog[];
  watchlist: WatchlistEntry[];
  goals: Record<string, number>;
  addLog: (log: WatchLog) => void;
  removeLog: (id: string) => void;
  toggleList: (entry: WatchlistEntry) => void;
  setGoal: (year: number, target: number) => void;
}
export const useLibrary = create<Library>()(
  persist(
    (set) => ({
      logs: [],
      watchlist: [],
      goals: {},
      addLog: (log) => {
        validateLog(log);
        set((s) => {
          if (s.logs.some((l) => l.id === log.id)) return s;
          return { logs: [log, ...s.logs] };
        });
      },
      removeLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      toggleList: (entry) =>
        set((s) => ({
          watchlist: s.watchlist.some(
            (e) =>
              e.mediaItem.id === entry.mediaItem.id &&
              e.period === entry.period,
          )
            ? s.watchlist.filter(
                (e) =>
                  !(
                    e.mediaItem.id === entry.mediaItem.id &&
                    e.period === entry.period
                  ),
              )
            : [...s.watchlist, entry],
        })),
      setGoal: (year, target) => {
        if (Number.isInteger(target) && target > 0 && target <= 10000)
          set((s) => ({ goals: { ...s.goals, [year]: target } }));
      },
    }),
    { name: "cinetrack-library", storage: createJSONStorage(() => storage) },
  ),
);
interface AvatarState {
  username: string;
  body: "warm" | "deep";
  equippedItems: UserProfile["equippedItems"];
  setBody: (body: "warm" | "deep") => void;
  equip: (id: string) => void;
}
export const useAvatar = create<AvatarState>()(
  persist(
    (set) => ({
      username: "Sinemasever",
      body: "warm",
      equippedItems: { background: "bg-indigo", outfit: "outfit-violet" },
      setBody: (body) => set({ body }),
      equip: (id) => {
        const item = items.find((i) => i.id === id);
        if (
          item &&
          progression(useLibrary.getState().logs).unlockedItemIds.includes(id)
        )
          set((s) => ({
            equippedItems: {
              ...s.equippedItems,
              [item.category]:
                s.equippedItems[item.category] === id ? undefined : id,
            },
          }));
      },
    }),
    { name: "cinetrack-avatar", storage: createJSONStorage(() => storage) },
  ),
);
export const useFilters = create<{
  type: MediaType;
  setType: (type: MediaType) => void;
}>((set) => ({ type: "movie", setType: (type) => set({ type }) }));
