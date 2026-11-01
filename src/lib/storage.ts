import { createMMKV } from "react-native-mmkv";
const mmkv = createMMKV({ id: "cinetrack-v1" });
export const storage = {
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => {
    mmkv.remove(key);
  },
};
