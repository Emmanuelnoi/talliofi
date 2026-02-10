import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import {
  useKeyboardShortcut,
  formatShortcut,
  getModifierKeySymbol,
} from '../use-keyboard-shortcut';

describe('useKeyboardShortcut', () => {
  const onTrigger = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onTrigger when the correct key is pressed', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'Escape',
        onTrigger,
      }),
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not call onTrigger for wrong key', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'Escape',
        onTrigger,
      }),
    );

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('requires meta modifier when specified (Mac)', () => {
    // Mock Mac platform
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

    renderHook(() =>
      useKeyboardShortcut({
        key: 'n',
        modifiers: ['meta'],
        onTrigger,
      }),
    );

    // Without meta key - should not trigger
    fireEvent.keyDown(document, { key: 'n' });
    expect(onTrigger).not.toHaveBeenCalled();

    // With meta key - should trigger
    fireEvent.keyDown(document, { key: 'n', metaKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('uses ctrl as meta fallback on non-Mac', () => {
    // Mock Windows platform
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

    renderHook(() =>
      useKeyboardShortcut({
        key: 'n',
        modifiers: ['meta'],
        onTrigger,
      }),
    );

    // With ctrl key on Windows - should trigger
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('respects enabled flag', () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useKeyboardShortcut({
          key: 'Escape',
          onTrigger,
          enabled,
        }),
      { initialProps: { enabled: false } },
    );

    // Should not trigger when disabled
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onTrigger).not.toHaveBeenCalled();

    // Enable the shortcut
    rerender({ enabled: true });

    // Should now trigger
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when typing in input fields (except Escape)', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'n',
        modifiers: ['meta'],
        onTrigger,
      }),
    );

    // Create an input and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Should not trigger when typing in input
    fireEvent.keyDown(input, { key: 'n', metaKey: true });
    expect(onTrigger).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does trigger Escape even in input fields', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'Escape',
        onTrigger,
      }),
    );

    // Create an input and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Escape should still trigger
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onTrigger).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('prevents default when configured', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'n',
        modifiers: ['meta'],
        onTrigger,
        preventDefault: true,
      }),
    );

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      metaKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('is case insensitive for letter keys', () => {
    renderHook(() =>
      useKeyboardShortcut({
        key: 'N',
        modifiers: ['meta'],
        onTrigger,
      }),
    );

    fireEvent.keyDown(document, { key: 'n', metaKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});

describe('formatShortcut', () => {
  it('formats shortcut for Mac', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform: 'macOS' },
      configurable: true,
    });

    expect(formatShortcut('N', ['meta'])).toBe('\u2318N');
    expect(formatShortcut('S', ['meta', 'shift'])).toBe('\u2318\u21E7S');
  });

  it('formats shortcut for Windows', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform: 'Windows' },
      configurable: true,
    });

    expect(formatShortcut('N', ['meta'])).toBe('Ctrl+N');
    expect(formatShortcut('S', ['meta', 'shift'])).toBe('Ctrl+Shift+S');
  });

  it('handles key without modifiers', () => {
    expect(formatShortcut('Escape')).toBe('ESCAPE');
  });
});

describe('getModifierKeySymbol', () => {
  it('returns Cmd symbol on Mac', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform: 'macOS' },
      configurable: true,
    });
    expect(getModifierKeySymbol()).toBe('\u2318');
  });

  it('returns Ctrl on Windows', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform: 'Windows' },
      configurable: true,
    });
    expect(getModifierKeySymbol()).toBe('Ctrl');
  });
});
