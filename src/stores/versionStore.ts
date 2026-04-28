import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppVersion = "v1" | "v2";
export type AppScenario = "order_history" | "homepage";
export type AppView = "homepage" | "order_history_v1" | "order_history_v2";

interface VersionState {
  view: AppView;
  setView: (view: AppView) => void;
  // Derived helpers (kept for compatibility)
  version: AppVersion;
  setVersion: (version: AppVersion) => void;
  scenario: AppScenario;
  setScenario: (scenario: AppScenario) => void;
}

const deriveVersion = (view: AppView): AppVersion =>
  view === "order_history_v2" ? "v2" : "v1";
const deriveScenario = (view: AppView): AppScenario =>
  view === "homepage" ? "homepage" : "order_history";

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      view: "order_history_v1",
      version: "v1",
      scenario: "order_history",
      setView: (view) =>
        set({ view, version: deriveVersion(view), scenario: deriveScenario(view) }),
      setVersion: (version) => {
        const current = get().view;
        const next: AppView =
          deriveScenario(current) === "homepage"
            ? "homepage"
            : version === "v2"
              ? "order_history_v2"
              : "order_history_v1";
        set({ view: next, version: deriveVersion(next), scenario: deriveScenario(next) });
      },
      setScenario: (scenario) => {
        const current = get().view;
        const next: AppView =
          scenario === "homepage"
            ? "homepage"
            : deriveVersion(current) === "v2"
              ? "order_history_v2"
              : "order_history_v1";
        set({ view: next, version: deriveVersion(next), scenario: deriveScenario(next) });
      },
    }),
    {
      name: "rexel-app-version",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ view: state.view }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.version = deriveVersion(state.view);
          state.scenario = deriveScenario(state.view);
        }
      },
    }
  )
);
