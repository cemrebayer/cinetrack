import { useEffect, useState } from "react";
import { supabase } from "./backend";
import { CustomList, listName } from "./lists";
import { MediaItem } from "../types";
export interface Person {
  id: string;
  handle: string;
}
// Social migration is separate; no legacy account session is exposed in Firebase UI.
export function useSocialUser(): string | null {
  return null;
}
function client() {
  if (!supabase)
    throw new Error(
      "Arkadaşlar ve ortak listeler için çevrimiçi hesap bağlantısı gerekiyor.",
    );
  return supabase;
}
export function socialError(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "İşlem tamamlanamadı. Tekrar dene.";
}
async function allRows<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 500) return out;
  }
}
export async function getFriends(userId: string) {
  const db = client();
  const [following, followers, profile] = await Promise.all([
    allRows<{ following_id: string }>((a, b) =>
      db
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .order("following_id")
        .range(a, b),
    ),
    allRows<{ follower_id: string }>((a, b) =>
      db
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .order("follower_id")
        .range(a, b),
    ),
    db
      .from("social_profiles")
      .select("id,handle")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  const ids = [
    ...new Set([
      ...following.map((f) => f.following_id),
      ...followers.map((f) => f.follower_id),
    ]),
  ];
  const people: Person[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db
      .from("social_profiles")
      .select("id,handle")
      .in("id", ids.slice(i, i + 100));
    if (error) throw error;
    people.push(...data);
  }
  return {
    following: following.map((f) => f.following_id),
    followers: followers.map((f) => f.follower_id),
    people,
    profile: profile.data as Person | null,
  };
}
export async function saveHandle(id: string, handle: string) {
  const name = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(name))
    throw new Error(
      "Kullanıcı adı 3–30 karakter olmalı: a-z, 0-9 ve alt çizgi.",
    );
  const db = client();
  const existing = await db
    .from("social_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const { error } = existing.data
    ? await db.from("social_profiles").update({ handle: name }).eq("id", id)
    : await db.from("social_profiles").insert({ id, handle: name });
  if (error) throw error;
}
export async function findPerson(handle: string) {
  const { data, error } = await client()
    .from("social_profiles")
    .select("id,handle")
    .eq("handle", handle.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as Person | null;
}
export async function follow(user: string, person: string, remove = false) {
  const db = client();
  const { error } = remove
    ? await db
        .from("follows")
        .delete()
        .eq("follower_id", user)
        .eq("following_id", person)
    : await db
        .from("follows")
        .insert({ follower_id: user, following_id: person });
  if (error) throw error;
}
export async function fetchCloudLists(): Promise<CustomList[]> {
  const db = client();
  const lists = await allRows<{ id: string; name: string; owner_id: string }>(
    (a, b) =>
      db
        .from("shared_lists")
        .select("id,name,owner_id")
        .order("id")
        .range(a, b),
  );
  return Promise.all(
    lists.map(async (l) => ({
      id: l.id,
      cloudId: l.id,
      name: l.name,
      ownerId: l.owner_id,
      items: (
        await allRows<{ media: MediaItem }>((a, b) =>
          db
            .from("shared_list_items")
            .select("media")
            .eq("list_id", l.id)
            .order("media_id")
            .range(a, b),
        )
      ).map((e) => e.media),
    })),
  );
}
export async function publishList(list: CustomList) {
  const { data, error } = await client().rpc("publish_shared_list", {
    p_name: listName(list.name),
    p_items: list.items,
  });
  if (error) throw error;
  return data as string;
}
export async function renameCloud(id: string, name: string) {
  const { error } = await client()
    .from("shared_lists")
    .update({ name: listName(name) })
    .eq("id", id);
  if (error) throw error;
}
export async function changeCloudItem(
  id: string,
  media: MediaItem,
  remove = false,
) {
  const db = client();
  const { error } = remove
    ? await db
        .from("shared_list_items")
        .delete()
        .eq("list_id", id)
        .eq("media_id", media.id)
    : await db.rpc("put_list_item", { p_list: id, p_media: media });
  if (error) throw error;
}
export async function inviteFriend(listId: string, handle: string) {
  const { error } = await client().rpc("invite_list_friend", {
    p_list: listId,
    p_handle: handle.trim().toLowerCase(),
  });
  if (error) throw error;
}
export async function listMembers(id: string) {
  const { data, error } = await client().rpc("get_list_members", {
    p_list: id,
  });
  if (error) throw error;
  return data as Person[];
}
export async function removeMember(listId: string, userId: string) {
  const { error } = await client()
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}
