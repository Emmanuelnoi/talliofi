import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnnouncer } from '../use-announcer';
import { useAnnouncerStore } from '@/stores/announcer-store';

describe('useAnnouncer', () => {
  beforeEach(() => {
    useAnnouncerStore.getState().clear();
  });

  it('announces a polite message by default', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      result.current.announce('Hello screen reader');
    });

    const msg = useAnnouncerStore.getState().message;
    expect(msg?.text).toBe('Hello screen reader');
    expect(msg?.politeness).toBe('polite');
  });

  it('announces an assertive message', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      result.current.announce('Error occurred', 'assertive');
    });

    const msg = useAnnouncerStore.getState().message;
    expect(msg?.text).toBe('Error occurred');
    expect(msg?.politeness).toBe('assertive');
  });

  it('clears the announcement', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      result.current.announce('Something');
    });
    expect(useAnnouncerStore.getState().message?.text).toBe('Something');

    act(() => {
      result.current.clear();
    });
    expect(useAnnouncerStore.getState().message).toBeNull();
  });
});
