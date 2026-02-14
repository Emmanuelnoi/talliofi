import { describe, it, expect, beforeEach } from 'vitest';
import { useEncryptionStore } from '../encryption-store';

describe('useEncryptionStore', () => {
  beforeEach(() => {
    useEncryptionStore.setState({
      enabled: false,
      unlocked: false,
    });
  });

  it('has correct default values', () => {
    const state = useEncryptionStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.unlocked).toBe(false);
  });

  it('sets enabled and resets unlocked', () => {
    useEncryptionStore.setState({ unlocked: true });
    useEncryptionStore.getState().setEnabled(true);

    const state = useEncryptionStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.unlocked).toBe(false);
  });

  it('sets unlocked', () => {
    useEncryptionStore.getState().setUnlocked(true);
    expect(useEncryptionStore.getState().unlocked).toBe(true);

    useEncryptionStore.getState().setUnlocked(false);
    expect(useEncryptionStore.getState().unlocked).toBe(false);
  });

  it('disabling encryption resets unlocked', () => {
    useEncryptionStore.setState({ enabled: true, unlocked: true });
    useEncryptionStore.getState().setEnabled(false);

    const state = useEncryptionStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.unlocked).toBe(false);
  });
});
