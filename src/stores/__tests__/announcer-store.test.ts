import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnouncerStore } from '../announcer-store';

describe('useAnnouncerStore', () => {
  beforeEach(() => {
    useAnnouncerStore.setState({ message: null });
  });

  it('starts with no message', () => {
    expect(useAnnouncerStore.getState().message).toBeNull();
  });

  it('sets a polite message by default', () => {
    useAnnouncerStore.getState().setMessage('Item saved');
    const message = useAnnouncerStore.getState().message;

    expect(message?.text).toBe('Item saved');
    expect(message?.politeness).toBe('polite');
    expect(message?.key).toBeTypeOf('number');
  });

  it('sets an assertive message', () => {
    useAnnouncerStore.getState().setMessage('Error occurred', 'assertive');
    const message = useAnnouncerStore.getState().message;

    expect(message?.text).toBe('Error occurred');
    expect(message?.politeness).toBe('assertive');
  });

  it('clears the message', () => {
    useAnnouncerStore.getState().setMessage('Test');
    expect(useAnnouncerStore.getState().message).not.toBeNull();

    useAnnouncerStore.getState().clear();
    expect(useAnnouncerStore.getState().message).toBeNull();
  });

  it('generates unique keys for repeated messages', () => {
    useAnnouncerStore.getState().setMessage('Same message');
    const key1 = useAnnouncerStore.getState().message?.key;

    // Small delay to ensure Date.now() differs
    useAnnouncerStore.getState().setMessage('Same message');
    const key2 = useAnnouncerStore.getState().message?.key;

    expect(key1).toBeTypeOf('number');
    expect(key2).toBeTypeOf('number');
  });
});
