import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useUIStore.setState({
      sidebarOpen: true,
      onboardingStep: 0,
    });
  });

  it('has correct default values', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.onboardingStep).toBe(0);
  });

  it('sets sidebar open state', () => {
    const { setSidebarOpen } = useUIStore.getState();

    setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('sets onboarding step', () => {
    const { setOnboardingStep } = useUIStore.getState();

    setOnboardingStep(3);
    expect(useUIStore.getState().onboardingStep).toBe(3);

    setOnboardingStep(0);
    expect(useUIStore.getState().onboardingStep).toBe(0);
  });

  it('maintains independent state between actions', () => {
    const state = useUIStore.getState();

    state.setSidebarOpen(false);
    state.setOnboardingStep(2);

    const updated = useUIStore.getState();
    expect(updated.sidebarOpen).toBe(false);
    expect(updated.onboardingStep).toBe(2);
  });
});
