import { create } from 'zustand';

interface AnnouncerMessage {
  /** The message text to announce */
  text: string;
  /** Politeness level for the announcement */
  politeness: 'polite' | 'assertive';
  /** Unique key to force re-announcement of same message */
  key: number;
}

interface AnnouncerStore {
  message: AnnouncerMessage | null;
  setMessage: (text: string, politeness?: 'polite' | 'assertive') => void;
  clear: () => void;
}

/**
 * Global store for ARIA live region announcements.
 *
 * This store is consumed by the LiveRegion component which renders
 * the actual ARIA live regions in the DOM.
 */
export const useAnnouncerStore = create<AnnouncerStore>((set) => ({
  message: null,

  setMessage: (text, politeness = 'polite') => {
    set({
      message: {
        text,
        politeness,
        // Use timestamp to ensure re-announcement of identical messages
        key: Date.now(),
      },
    });
  },

  clear: () => {
    set({ message: null });
  },
}));
