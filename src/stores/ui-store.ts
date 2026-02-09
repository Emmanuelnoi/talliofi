import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  /** Flag to trigger plan list refresh after mutations */
  planListVersion: number;
  incrementPlanListVersion: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  onboardingStep: 0,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  planListVersion: 0,
  incrementPlanListVersion: () =>
    set((state) => ({ planListVersion: state.planListVersion + 1 })),
}));
