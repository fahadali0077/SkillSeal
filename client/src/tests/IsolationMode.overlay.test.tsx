// IsolationMode.overlay.test.tsx
// Regression: the assessment overlay must own the viewport in EVERY state.
// When the completed/terminated screens were returned bare, they dropped into
// normal document flow at the App level and the app shell (topbar, empty page,
// mobile nav) stayed visible underneath them — reachable by scrolling.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/socketClient', () => ({
  on: vi.fn(() => vi.fn()), emit: vi.fn(), connectSocket: vi.fn(),
  disconnectSocket: vi.fn(), getSocket: vi.fn(),
  SOCKET_EVENTS: { SESSION_ACTION: 'session_action' },
}));

vi.mock('@/lib/apiBase', () => ({
  API_ORIGIN: 'http://localhost',
  apiFetch: vi.fn(() => new Promise(() => {})), // keep the report pending
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuthStore: Object.assign(() => ({}), { getState: () => ({ accessToken: 't' }) }),
}));

// Drive IsolationMode purely through the status selector.
let status = 'completed';
vi.mock('@/features/assessment/useAssessment', () => ({
  useAssessmentStore: Object.assign(
    (sel: (s: Record<string, unknown>) => unknown) =>
      sel({
        skillName: 'React', tier: 'beginner', sessionState: null, sessionId: 'sess-1',
        handleAntiCheatEvent: vi.fn(), submitAnswer: vi.fn(), resetAssessment: vi.fn(),
      }),
    { setState: vi.fn(), getState: () => ({ sessionId: 'sess-1' }) },
  ),
  useAssessmentStatus: () => status,
  useCurrentQuestion: () => null,
  useTimeRemaining: () => 0,
  useStrikeCount: () => 0,
  useSessionResult: () => null,
  timerIntervalRef: { current: null },
}));

import IsolationMode from '@/features/assessment/IsolationMode';

function renderOverlay() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        {/* Stand-in for the app shell that sits behind the overlay. */}
        <div data-testid="app-shell" style={{ height: 2000 }}>shell</div>
        <IsolationMode />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Walk up from any rendered node to find a fixed, full-viewport ancestor. */
function hasFixedOverlay(container: HTMLElement) {
  const dialog = container.querySelector('[aria-modal="true"]');
  if (!dialog) return false;
  return (dialog as HTMLElement).className.includes('fixed inset-0');
}

describe('assessment overlay owns the viewport', () => {
  beforeEach(() => { document.body.style.overflow = ''; });
  afterEach(() => { vi.clearAllMocks(); });

  it('wraps the completed state in a fixed, modal overlay', () => {
    status = 'completed';
    const { container } = renderOverlay();
    expect(hasFixedOverlay(container)).toBe(true);
  });

  it('wraps the terminated state in a fixed, modal overlay', () => {
    status = 'terminated';
    const { container } = renderOverlay();
    expect(hasFixedOverlay(container)).toBe(true);
  });

  it('wraps the active state in a fixed, modal overlay', () => {
    status = 'active';
    const { container } = renderOverlay();
    expect(hasFixedOverlay(container)).toBe(true);
  });

  it('locks body scroll while the overlay is mounted, and restores it after', () => {
    status = 'active';
    const { unmount } = renderOverlay();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
