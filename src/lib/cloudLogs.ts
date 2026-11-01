import {
  Timestamp,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { requireFirebase } from "./firebase";
import { WatchLog } from "../types";
import { validateLog } from "./domain";
export function encodeLog(log: WatchLog) {
  validateLog(log);
  const m = log.mediaItem;
  return {
    mediaType: m.type,
    tmdbId: m.tmdbId,
    title: m.title,
    runtimeMinutes: m.runtimeMinutes,
    posterPath: m.posterPath,
    genres: m.genres,
    releaseYear: m.releaseYear,
    watchedAt: Timestamp.fromDate(new Date(log.watchedAt)),
    createdAt: Timestamp.fromDate(
      new Date(log.createdAt ?? new Date().toISOString()),
    ),
    isRewatch: log.isRewatch ?? false,
    ...(log.rating !== undefined ? { rating: log.rating } : {}),
    ...(log.review !== undefined ? { review: log.review } : {}),
    ...(m.type === "tv"
      ? { seasonNumber: log.seasonNumber, episodeNumber: log.episodeNumber }
      : {}),
  };
}
export function decodeLog(id: string, d: DocumentData): WatchLog {
  if (
    !(d.watchedAt instanceof Timestamp) ||
    !(d.createdAt instanceof Timestamp) ||
    !["movie", "tv"].includes(d.mediaType) ||
    !Number.isInteger(d.tmdbId) ||
    typeof d.title !== "string" ||
    !Number.isFinite(d.runtimeMinutes) ||
    d.runtimeMinutes <= 0
  ) {
    throw new Error(
      "Bir izleme kaydının biçimi geçersiz. Veritabanındaki alanlarını kontrol et.",
    );
  }
  return {
    id,
    mediaItem: {
      id: `${d.mediaType}-${d.tmdbId}`,
      tmdbId: d.tmdbId,
      title: d.title,
      type: d.mediaType,
      runtimeMinutes: d.runtimeMinutes,
      posterPath: typeof d.posterPath === "string" ? d.posterPath : "",
      genres: Array.isArray(d.genres)
        ? d.genres.filter((g: unknown) => typeof g === "string")
        : [],
      releaseYear: Number.isInteger(d.releaseYear) ? d.releaseYear : 0,
    },
    watchedAt: d.watchedAt.toDate().toISOString(),
    createdAt: d.createdAt.toDate().toISOString(),
    isRewatch: d.isRewatch === true,
    ...(d.rating !== undefined ? { rating: d.rating } : {}),
    ...(d.review !== undefined ? { review: d.review } : {}),
    ...(d.mediaType === "tv"
      ? { seasonNumber: d.seasonNumber, episodeNumber: d.episodeNumber }
      : {}),
  };
}
function userLogs() {
  const { auth, db } = requireFirebase();
  if (!auth.currentUser) throw new Error("Kayıt için giriş yapmalısın.");
  return collection(db, "users", auth.currentUser.uid, "watchLogs");
}
export const saveCloudLog = (log: WatchLog) =>
  setDoc(doc(userLogs(), log.id), encodeLog(log));
export const removeCloudLog = (id: string) => deleteDoc(doc(userLogs(), id));
export function observeLogs(
  uid: string,
  next: (logs: WatchLog[]) => void,
  error: (e: unknown) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    collection(db, "users", uid, "watchLogs"),
    (snapshot) => {
      try {
        next(snapshot.docs.map((d) => decodeLog(d.id, d.data())));
      } catch (e) {
        error(e);
      }
    },
    error,
  );
}
