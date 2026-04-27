import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppVersion = "v1" | "v2";

interface VersionState {
  version: AppVersion;
  setVersion: (version: AppVersion) => void;
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set) => ({
      version: "v1",
      setVersion: (version) => set({ version }),
    }),
    {
      name: "rexel-app-version",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ version: state.version }),
    }
  )
);

