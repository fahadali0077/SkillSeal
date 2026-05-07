// ─────────────────────────────────────────────────────────────────────────────
// setupTests.ts  –  /client/src/tests/setupTests.ts
// Global test setup for Vitest + React Testing Library.
// ─────────────────────────────────────────────────────────────────────────────

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatically clean up after each test
afterEach(() => { cleanup(); });

// ── Stub browser APIs not available in jsdom ──────────────────────────────────

// Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText:  vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// IntersectionObserver (used by framer-motion)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}));

// matchMedia (Tailwind breakpoint helpers)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches:            false,
    media:              query,
    onchange:           null,
    addListener:        vi.fn(),
    removeListener:     vi.fn(),
    addEventListener:   vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:      vi.fn(),
  })),
});

// Silence Framer Motion warnings in test output
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    // Pass-through AnimatePresence without animation overhead
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(actual.motion, {
      get: (target, prop) => {
        // Return a simple wrapper for motion.div etc.
        if (typeof prop === 'string' && prop in target) {
          return target[prop as keyof typeof target];
        }
        return target[prop as keyof typeof target];
      },
    }),
  };
});

// Suppress console.error from React act() warnings during async tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: An update to') ||
     args[0].includes('Warning: ReactDOM.render'))
  ) return;
  originalConsoleError(...args);
};

// ── ClipboardEvent polyfill for jsdom ─────────────────────────────────────────
if (typeof ClipboardEvent === 'undefined') {
  (global as any).ClipboardEvent = class ClipboardEvent extends Event {
    clipboardData: DataTransfer | null;
    constructor(type: string, eventInitDict?: ClipboardEventInit) {
      super(type, eventInitDict);
      this.clipboardData = eventInitDict?.clipboardData ?? null;
    }
  };
}

// ── HTMLElement.spellcheck default in jsdom ───────────────────────────────────
// jsdom doesn't reflect the spellcheck attribute as a property by default.
// Patch HTMLTextAreaElement to return false when attribute is explicitly set to "false".
const origGetAttribute = HTMLElement.prototype.getAttribute;
Object.defineProperty(HTMLTextAreaElement.prototype, 'spellcheck', {
  get(this: HTMLTextAreaElement) {
    const attr = origGetAttribute.call(this, 'spellcheck');
    if (attr === null) return true; // default
    return attr !== 'false';
  },
  configurable: true,
});

// ── Global fetch stub (for components that use bare fetch()) ──────────────────
// Ensure globalThis.fetch is patchable by vitest's vi.stubGlobal
if (typeof globalThis.fetch === 'undefined') {
  (globalThis as any).fetch = () => Promise.reject(new Error('fetch not mocked'));
}
