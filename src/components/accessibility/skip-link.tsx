import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /** The ID of the element to skip to (without the #) */
  targetId: string;
  /** The text to display in the skip link */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Skip navigation link for keyboard users.
 *
 * This component renders a link that is visually hidden but becomes
 * visible when focused. It allows keyboard users to skip repetitive
 * navigation and jump directly to the main content.
 *
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks - Level A)
 *
 * @example
 * ```tsx
 * // In your layout component:
 * <SkipLink targetId="main-content">Skip to main content</SkipLink>
 * // ... navigation ...
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({
  targetId,
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Visually hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only',
        // Positioning and styling when visible
        'focus:fixed focus:left-4 focus:top-4 focus:z-[100]',
        'focus:rounded-md focus:bg-background focus:px-4 focus:py-2',
        'focus:text-sm focus:font-medium focus:text-foreground',
        'focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:outline-none',
        // Transition for smooth appearance
        'transition-opacity duration-150',
        className,
      )}
    >
      {children}
    </a>
  );
}

SkipLink.displayName = 'SkipLink';
