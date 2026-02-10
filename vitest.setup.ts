import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';
import { clearAllData } from '@/data/db';
import { Blob as NodeBlob } from 'node:buffer';
import { createElement } from 'react';
import type { ReactNode } from 'react';

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom lacks
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock window.matchMedia for useIsMobile hook (jsdom doesn't support it)
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = NodeBlob as unknown as typeof Blob;
} else if (typeof globalThis.Blob.prototype.arrayBuffer !== 'function') {
  globalThis.Blob = NodeBlob as unknown as typeof Blob;
}

vi.mock('recharts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('recharts');
  const fallbackWidth = 800;
  const fallbackHeight = 400;

  return {
    ...actual,
    ResponsiveContainer: ({
      width,
      height,
      children,
    }: {
      width?: number | string;
      height?: number | string;
      children:
        | ReactNode
        | ((size: { width: number; height: number }) => ReactNode);
    }) => {
      const resolvedWidth = typeof width === 'number' ? width : fallbackWidth;
      const resolvedHeight =
        typeof height === 'number' ? height : fallbackHeight;
      const content =
        typeof children === 'function'
          ? children({ width: resolvedWidth, height: resolvedHeight })
          : children;
      return createElement(
        'div',
        { style: { width: resolvedWidth, height: resolvedHeight } },
        content,
      );
    },
  };
});

beforeEach(async () => {
  await clearAllData();
});
