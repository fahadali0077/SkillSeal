// IsolationMode.test.tsx — paste blocking, timer display/colors, MCQ auto-submit
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useAssessmentStore } from '@/features/assessment/useAssessment';
import MCQQuestion      from '@/features/assessment/MCQQuestion';
import MicroTheoryQuestion from '@/features/assessment/MicroTheoryQuestion';
import TimerBar         from '@/features/assessment/TimerBar';

vi.mock('../../lib/socketClient', () => ({
  on:            vi.fn(() => vi.fn()),
  emit:          vi.fn(),
  connectSocket: vi.fn(),
  SOCKET_EVENTS: { SESSION_ACTION:'session_action', NOTIFICATION:'notification', JOIN_ROOM:'join_room' },
}));

const mockQuestion = {
  _id:'q-001', questionType:'mcq', difficulty:'medium', tier:'intermediate',
  skillId:'sk-001',
  text:'What does useEffect do?',
  options:['Manages state','Runs side effects','Creates context','Memoizes values'],
  timeLimitMs:60_000, pointValue:1, hint:'',
};

const server = setupServer(
  http.post('/api/v1/sessions/start', () => HttpResponse.json({
    success:true, data:{
      sessionId:'sess-iso-001',
      firstQuestion:mockQuestion,
      sessionState:{ sessionId:'sess-iso-001', skillId:'sk-001', skillName:'React',
        declaredTier:'intermediate', status:'active', startTime:new Date().toISOString(),
        currentQuestionIndex:0, totalQuestions:20, timeRemainingMs:60_000,
        strikeCount:0, maxStrikes:3, answeredCount:0, timeoutCount:0 },
    },
  })),
  http.post('/api/v1/answers/submit', () => HttpResponse.json({
    success:true, data:{ accepted:true, isCorrect:true, conceptScore:1,
      sessionComplete:false,
      nextQuestion:{...mockQuestion, _id:'q-002', text:'Next question?'},
      sessionState:{ sessionId:'sess-iso-001', skillId:'sk-001', skillName:'React',
        declaredTier:'intermediate', status:'active', startTime:new Date().toISOString(),
        currentQuestionIndex:1, totalQuestions:20, timeRemainingMs:60_000,
        strikeCount:0, maxStrikes:3, answeredCount:1, timeoutCount:0 },
    },
  })),
  http.post('/api/v1/events/log', () => HttpResponse.json({
    success:true, data:{ strikeCount:1, action:'warning' },
  })),
);

beforeAll(() => server.listen({ onUnhandledRequest:'warn' }));
afterEach(() => { server.resetHandlers(); useAssessmentStore.getState().resetAssessment(); });
afterAll(() => server.close());

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions:{ queries:{retry:0}, mutations:{retry:0} } });
  return (
    <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
  );
}

// ── TimerBar ──────────────────────────────────────────────────────────────────
describe('TimerBar', () => {
  it('renders "07s" for 7000ms remaining under 60s', () => {
    const { container } = render(
      <TimerBar timeLimitMs={60_000} timeRemainingMs={7_000} />
    );
    expect(container.textContent).toContain('07s');
  });

  it('renders MM:SS for >60s remaining', () => {
    const { container } = render(
      <TimerBar timeLimitMs={120_000} timeRemainingMs={90_000} />
    );
    expect(container.textContent).toContain('01:30');
  });

  it('bar is blue when >50% remaining', () => {
    const { container } = render(
      <TimerBar timeLimitMs={60_000} timeRemainingMs={40_000} />
    );
    const bar = container.querySelector('[style*="background"]') as HTMLElement;
    const bg = bar?.style.background ?? bar?.style.backgroundColor ?? '';
    // accept hex #3b82f6 or rgb(59, 130, 246)
    expect(bg.toLowerCase()).toMatch(/3b82f6|59,\s*130,\s*246/i);
  });

  it('bar is amber at 30% remaining', () => {
    const { container } = render(
      <TimerBar timeLimitMs={60_000} timeRemainingMs={18_000} />
    );
    const bar = container.querySelector('[style*="background"]') as HTMLElement;
    const bg = bar?.style.background ?? bar?.style.backgroundColor ?? '';
    // accept hex #f59e0b or rgb(245, 158, 11)
    expect(bg.toLowerCase()).toMatch(/f59e0b|245,\s*158,\s*11/i);
  });

  it('bar is red at 16% remaining', () => {
    const { container } = render(
      <TimerBar timeLimitMs={60_000} timeRemainingMs={10_000} />
    );
    const bar = container.querySelector('[style*="background"]') as HTMLElement;
    const bg = bar?.style.background ?? bar?.style.backgroundColor ?? '';
    // accept hex #ef4444 or rgb(239, 68, 68)
    expect(bg.toLowerCase()).toMatch(/ef4444|239,\s*68,\s*68/i);
  });

  it('shows "00s" when timeRemainingMs is 0', () => {
    const { container } = render(
      <TimerBar timeLimitMs={60_000} timeRemainingMs={0} />
    );
    expect(container.textContent).toContain('00s');
  });
});

// ── MCQQuestion ───────────────────────────────────────────────────────────────
describe('MCQQuestion', () => {
  it('renders question text and 4 options', () => {
    render(<Wrapper><MCQQuestion question={mockQuestion as never} onSubmit={vi.fn()} isSubmitting={false} /></Wrapper>);
    expect(screen.getByText('What does useEffect do?')).toBeTruthy();
    expect(screen.getByText('Manages state')).toBeTruthy();
    expect(screen.getByText('Runs side effects')).toBeTruthy();
    expect(screen.getByText('Creates context')).toBeTruthy();
    expect(screen.getByText('Memoizes values')).toBeTruthy();
  });

  it('clicking an option calls onSubmit within 200ms (auto-submit)', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    render(<Wrapper><MCQQuestion question={mockQuestion as never} onSubmit={onSubmit} isSubmitting={false} /></Wrapper>);

    fireEvent.click(screen.getByText('Runs side effects'));
    await act(async () => { vi.advanceTimersByTime(200); });

    expect(onSubmit).toHaveBeenCalledWith('B');
    vi.useRealTimers();
  });

  it('all options disabled after one selection', async () => {
    vi.useFakeTimers();
    render(<Wrapper><MCQQuestion question={mockQuestion as never} onSubmit={vi.fn()} isSubmitting={false} /></Wrapper>);

    fireEvent.click(screen.getByText('Manages state'));
    await act(async () => { vi.advanceTimersByTime(200); });

    screen.getAllByRole('radio').forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
    vi.useRealTimers();
  });

  it('isSubmitting=true prevents onSubmit', () => {
    const onSubmit = vi.fn();
    render(<Wrapper><MCQQuestion question={mockQuestion as never} onSubmit={onSubmit} isSubmitting={true} /></Wrapper>);
    fireEvent.click(screen.getByText('Runs side effects'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ── MicroTheoryQuestion — paste prevention ────────────────────────────────────
describe('MicroTheoryQuestion', () => {
  const microQ = { ...mockQuestion, _id:'q-mt-001', questionType:'micro-theory',
    text:'Explain the virtual DOM.', options:[], timeLimitMs:150_000 };

  it('onPaste calls preventDefault', () => {
    const reg = vi.fn();
    render(<Wrapper><MicroTheoryQuestion question={microQ as never} onSubmit={vi.fn()} isSubmitting={false} registerAutoSubmit={reg} /></Wrapper>);

    const textarea = screen.getByRole('textbox');
    const evt      = new ClipboardEvent('paste', { bubbles:true, cancelable:true });
    const spy      = vi.spyOn(evt, 'preventDefault');
    textarea.dispatchEvent(evt);
    expect(spy).toHaveBeenCalled();
  });

  it('spellCheck is false on textarea', () => {
    const reg = vi.fn();
    render(<Wrapper><MicroTheoryQuestion question={microQ as never} onSubmit={vi.fn()} isSubmitting={false} registerAutoSubmit={reg} /></Wrapper>);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.spellcheck).toBe(false);
  });

  it('submit button disabled when empty', () => {
    const reg = vi.fn();
    render(<Wrapper><MicroTheoryQuestion question={microQ as never} onSubmit={vi.fn()} isSubmitting={false} registerAutoSubmit={reg} /></Wrapper>);
    const btn = screen.getByRole('button', { name:/submit/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('submit button enabled after typing', async () => {
    const user = userEvent.setup();
    const reg  = vi.fn();
    render(<Wrapper><MicroTheoryQuestion question={microQ as never} onSubmit={vi.fn()} isSubmitting={false} registerAutoSubmit={reg} /></Wrapper>);
    await user.type(screen.getByRole('textbox'), 'The virtual DOM is a lightweight copy');
    expect((screen.getByRole('button',{name:/submit/i}) as HTMLButtonElement).disabled).toBe(false);
  });

  it('registerAutoSubmit called on mount with a function', () => {
    const reg = vi.fn();
    render(<Wrapper><MicroTheoryQuestion question={microQ as never} onSubmit={vi.fn()} isSubmitting={false} registerAutoSubmit={reg} /></Wrapper>);
    expect(reg).toHaveBeenCalledTimes(1);
    expect(typeof reg.mock.calls[0]![0]).toBe('function');
  });
});
