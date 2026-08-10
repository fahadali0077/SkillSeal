// ─────────────────────────────────────────────────────────────────────────────
// sanitize.test.ts
//
// This middleware had zero coverage because it was never wired in (audit §1.1).
// That is exactly how a broken regex — a literal 0x08 byte where `\b` belonged —
// survived in the <script> branch without anyone noticing: nothing imported it,
// so nothing exercised it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import { xssSanitize, __testables } from '../middleware/sanitize.middleware';

const { stripString } = __testables;

function run(body: unknown): Record<string, unknown> {
  const req = { body } as Request;
  let called = false;
  xssSanitize(req, {} as Response, () => { called = true; });
  expect(called).toBe(true);
  return req.body as Record<string, unknown>;
}

describe('xssSanitize — script tags', () => {
  it('strips a simple script element', () => {
    expect(stripString('<script>alert(1)</script>hello')).toBe('hello');
  });

  it('strips a script element with attributes', () => {
    expect(stripString('<script src="https://evil.example/x.js"></script>ok')).toBe('ok');
  });

  it('strips a script element spanning newlines', () => {
    expect(stripString('a<script>\n  alert(1);\n</script>b')).toBe('ab');
  });

  it('strips an unclosed script element', () => {
    expect(stripString('safe<script>alert(1)')).toBe('safe');
  });

  it('is case-insensitive', () => {
    expect(stripString('<ScRiPt>alert(1)</ScRiPt>x')).toBe('x');
  });

  it('strips a stray closing fragment', () => {
    expect(stripString('x</script>y')).toBe('xy');
  });
});

describe('xssSanitize — URLs and handlers', () => {
  it('strips the javascript: scheme', () => {
    expect(stripString('javascript:alert(1)')).toBe('alert(1)');
  });

  it('strips the vbscript: scheme', () => {
    expect(stripString('vbscript:msgbox')).toBe('msgbox');
  });

  it('strips a scheme with interleaved whitespace', () => {
    expect(stripString('javascript : alert(1)')).toBe(' alert(1)');
  });

  it('strips inline event handlers', () => {
    expect(stripString('onerror=alert(1)')).toBe('alert(1)');
    expect(stripString('onclick = x')).toBe(' x');
  });

  it('leaves ordinary prose untouched', () => {
    const prose = 'Senior engineer. 5+ years with React, Node & Postgres — a@b.com';
    expect(stripString(prose)).toBe(prose);
  });

  it('does not mangle words that merely start with "on"', () => {
    expect(stripString('online onboarding is ongoing')).toBe('online onboarding is ongoing');
  });
});

describe('xssSanitize — traversal', () => {
  it('sanitises nested objects and arrays', () => {
    const out = run({
      headline: '<script>alert(1)</script>Engineer',
      links: ['javascript:evil()', 'https://ok.example'],
      nested: { bio: 'x<script>y</script>z' },
    });
    expect(out.headline).toBe('Engineer');
    expect((out.links as string[])[0]).toBe('evil()');
    expect((out.links as string[])[1]).toBe('https://ok.example');
    expect((out.nested as Record<string, unknown>).bio).toBe('xz');
  });

  it('preserves non-string primitives', () => {
    const out = run({ n: 42, b: true, nul: null, undef: undefined });
    expect(out.n).toBe(42);
    expect(out.b).toBe(true);
    expect(out.nul).toBeNull();
  });

  it('does not recurse without bound on deeply nested input', () => {
    let deep: Record<string, unknown> = { v: '<script>x</script>' };
    for (let i = 0; i < 50; i++) deep = { child: deep };
    expect(() => run(deep)).not.toThrow();
  });

  it('tolerates a missing body', () => {
    const req = {} as Request;
    let called = false;
    xssSanitize(req, {} as Response, () => { called = true; });
    expect(called).toBe(true);
  });
});
