import { useEffect, useRef } from 'react';
import { useAnnouncerStore } from '@/stores/announcer-store';

/**
 * ARIA live region component for screen reader announcements.
 *
 * This component renders two visually hidden live regions (polite and assertive)
 * that are used to announce dynamic content changes to assistive technologies.
 *
 * It should be rendered once at the app root level and is automatically
 * connected to the announcer store.
 *
 * WCAG 2.1 Success Criterion 4.1.3 (Status Messages - Level AA)
 *
 * @example
 * ```tsx
 * // In your app root:
 * function App() {
 *   return (
 *     <>
 *       <LiveRegion />
 *       <Routes />
 *     </>
 *   );
 * }
 *
 * // In any component:
 * const { announce } = useAnnouncer();
 * announce('3 results found');
 * ```
 */
export function LiveRegion() {
  const message = useAnnouncerStore((state) => state.message);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;

    const targetRef =
      message.politeness === 'assertive' ? assertiveRef : politeRef;

    if (targetRef.current) {
      // Clear first to ensure re-announcement
      targetRef.current.textContent = '';
      // Use requestAnimationFrame to ensure DOM update before setting content
      requestAnimationFrame(() => {
        if (targetRef.current) {
          targetRef.current.textContent = message.text;
        }
      });
    }
  }, [message?.key, message?.text, message?.politeness, message]);

  return (
    <>
      {/* Polite announcements - wait for silence */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Assertive announcements - interrupt immediately */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

LiveRegion.displayName = 'LiveRegion';
