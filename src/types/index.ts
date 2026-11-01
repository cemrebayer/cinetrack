export type MediaType = "movie" | "tv";
export interface MediaItem {
  id: string;
  tmdbId: number;
  title: string;
  type: MediaType;
  posterPath: string;
  runtimeMinutes: number;
  genres: string[];
  releaseYear: number;
}
export interface WatchLog {
  id: string;
  mediaItem: MediaItem;
  watchedAt: string;
  createdAt?: string;
  isRewatch?: boolean;
  rating?: number;
  review?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
export type ItemCategory = "hat" | "outfit" | "accessory" | "background";
export interface AvatarItem {
  id: string;
  name: string;
  category: ItemCategory;
  requiredXp: number;
  assetSource: string;
  milestone?: "movies10" | "hours100";
}
export interface UserProfile {
  id: string;
  username: string;
  currentXp: number;
  level: number;
  equippedItems: Partial<Record<ItemCategory, string>>;
  unlockedItemIds: string[];
}
export interface WatchlistEntry {
  mediaItem: MediaItem;
  period: string;
}
