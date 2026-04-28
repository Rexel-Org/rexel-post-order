import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppVersion = "v1" | "v2";
export type AppScenario = "order_history" | "homepage";

interface VersionState {
  version: AppVersion;
  setVersion: (version: AppVersion) => void;
  scenario: AppScenario;
  setScenario: (scenario: AppScenario) => void;
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set) => ({
      version: "v1",
      setVersion: (version) => set({ version }),
      scenario: "order_history",
      setScenario: (scenario) => set({ scenario }),
    }),
    {
      name: "rexel-app-version",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ version: state.version, scenario: state.scenario }),
    }
  )
);
