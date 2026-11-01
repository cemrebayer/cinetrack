import { storage } from "./storage";
import { useAvatar, useLibrary, useFilters } from "../store";
import { useLists } from "../store/lists";
function cached(name: string) {
  try {
    return JSON.parse(storage.getItem(name) ?? "{}").state ?? {};
  } catch {
    return {};
  }
}
export function bindAccountCache(uid: string | null) {
  const scope = uid ?? "signed-out";
  const libraryKey = `cinetrack-library:${scope}`;
  const avatarKey = `cinetrack-avatar:${scope}`;
  const listsKey = `cinetrack-custom-lists:${scope}`;
  const lib = uid ? cached(libraryKey) : {};
  const avatar = uid ? cached(avatarKey) : {};
  const lists = uid ? cached(listsKey) : {};
  // Read before setState, since persist writes every state update immediately.
  useLibrary.persist.setOptions({ name: libraryKey });
  useAvatar.persist.setOptions({ name: avatarKey });
  useLists.persist.setOptions({ name: listsKey });
  useLibrary.setState({
    logs: lib.logs ?? [],
    watchlist: lib.watchlist ?? [],
    goals: lib.goals ?? {},
  });
  useAvatar.setState({
    username: "Sinemasever",
    body: avatar.body ?? "warm",
    equippedItems: avatar.equippedItems ?? {
      background: "bg-indigo",
      outfit: "outfit-violet",
    },
  });
  useLists.setState({ lists: lists.lists ?? [] });
  useFilters.setState({ type: "movie" });
}
