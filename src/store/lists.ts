import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "../lib/storage";
import { CustomList, listName, addListItem } from "../lib/lists";
import { MediaItem } from "../types";
interface ListsState {
  lists: CustomList[];
  create: (name: string) => string;
  rename: (id: string, name: string) => void;
  add: (id: string, media: MediaItem) => void;
  remove: (id: string, mediaId: string) => void;
  link: (id: string, cloudId: string, ownerId: string) => void;
}
export const useLists = create<ListsState>()(
  persist(
    (set) => ({
      lists: [],
      create: (name) => {
        const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const value = listName(name);
        set((s) => ({ lists: [...s.lists, { id, name: value, items: [] }] }));
        return id;
      },
      rename: (id, name) => {
        const value = listName(name);
        set((s) => ({
          lists: s.lists.map((l) => (l.id === id ? { ...l, name: value } : l)),
        }));
      },
      add: (id, media) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, items: addListItem(l.items, media) } : l,
          ),
        })),
      remove: (id, mediaId) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id
              ? { ...l, items: l.items.filter((m) => m.id !== mediaId) }
              : l,
          ),
        })),
      link: (id, cloudId, ownerId) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, cloudId, ownerId } : l,
          ),
        })),
    }),
    {
      name: "cinetrack-custom-lists",
      storage: createJSONStorage(() => storage),
    },
  ),
);
