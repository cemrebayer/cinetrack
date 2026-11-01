import { create } from "zustand";
import { storage } from "../lib/storage";
interface WelcomeState {
  completed: boolean;
  finish: () => void;
  replay: () => void;
}
export const useWelcome = create<WelcomeState>((set) => ({
  completed: storage.getItem("cinetrack-onboarding-v1") === "done",
  finish: () => {
    storage.setItem("cinetrack-onboarding-v1", "done");
    set({ completed: true });
  },
  replay: () => set({ completed: false }),
}));
