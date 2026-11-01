import { MediaItem } from "../types";
export interface CustomList {
  id: string;
  name: string;
  items: MediaItem[];
  cloudId?: string;
  ownerId?: string;
}
export function listName(value: string) {
  const name = value.trim();
  if (!name) throw new Error("Listene bir ad ver.");
  if (name.length > 120)
    throw new Error("Liste adı en fazla 120 karakter olabilir.");
  return name;
}
export function addListItem(items: MediaItem[], media: MediaItem) {
  return items.some((m) => m.id === media.id) ? items : [...items, media];
}
export function goalPercent(completed: number, target: number) {
  return target > 0 ? Math.round((completed / target) * 100) : 0;
}
export function listShareText(list: CustomList) {
  return `${list.name}\n\n${list.items.map((m, i) => `${i + 1}. ${m.title} (${m.type === "movie" ? "Film" : "Dizi"})`).join("\n")}\n\nCineTrack · Liste anlık görüntüsü`;
}
