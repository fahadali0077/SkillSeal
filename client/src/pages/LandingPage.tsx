import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import SealMark from '../components/SealMark';
import { enter, enterAt } from '../lib/motion';
import { useSEO } from '../lib/useSEO';

// ── Content ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#skills',       label: 'Skills' },
  { href: '#recruiters',   label: 'For recruiters' },
];

const STATS = [
  { value: '20',   label: 'Questions per assessment' },
  { value: '4',    label: 'Difficulty tiers' },
  { value: '3',    label: 'Strikes before termination' },
  { value: '100%', label: 'Publicly verifiable' },
];

const STEPS = [
  {
    n: '01',
    title: 'Declare skill and tier',
    desc: 'Pick from the skill registry and commit to a tier — beginner through expert. The tier you sit is printed on the certificate, so claiming high is a real risk.',
  },
  {
    n: '02',
    title: 'Sit the monitored session',
    desc: '20 adaptive questions — multiple choice, scenarios, written theory. Tab switches, clipboard events and timing anomalies are recorded to the session’s audit trail.',
  },
  {
    n: '03',
    title: 'Receive a verifiable seal',
    desc: 'A certificate with score, integrity record, issue and expiry dates, at a permanent public URL. Share it, or let recruiters find it by filtering on it.',
  },
];

const REGISTRY = [
  { name: 'React',      area: 'Frontend' },
  { name: 'Node.js',    area: 'Backend' },
  { name: 'PostgreSQL', area: 'Data' },
  { name: 'MongoDB',    area: 'Data' },
  { name: 'TypeScript', area: 'Language' },
  { name: 'Docker',     area: 'Platform' },
];

const SAMPLE_CANDIDATES = [
  { initials: 'AR', name: 'Ayesha Rahman',  role: 'Backend engineer · Lahore',    seal: 'Docker · ADV',   score: 94, integrity: 'Clean' },
  { initials: 'MK', name: 'Miriam Khoury',  role: 'Platform engineer · Remote',   seal: 'Postgres · EXP', score: 88, integrity: '1 flag' },
  { initials: 'JO', name: 'Jonas Öberg',    role: 'SRE · Berlin',                 seal: 'GraphQL · INT',  score: 79, integrity: 'Clean' },
];

// ── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-paper-rule">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <SealMark size={26} tone="seal" />
          <span className="font-display font-medium text-[19px] leading-none tracking-[-0.015em] text-ink-900">
            SkillSeal
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/verify" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
            Verify a certificate
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-ink-800 hover:text-ink-900">Sign in</Link>
          <Link to="/register" className="btn-seal py-2 px-3.5">Get started</Link>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 -mr-2 text-ink-700"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-paper-line bg-paper-card">
          <div className="px-5 py-3 flex flex-col">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-sm font-medium text-ink-700 border-b border-paper-line">
                {l.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="py-3 text-sm font-semibold text-ink-800">
              Sign in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)} className="btn-seal mt-2 mb-3">
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── The artifact ─────────────────────────────────────────────────────────────
// The hero's job is to show what you get, at full fidelity, with its ID and
// public URL visible. This is the one elevated object on the page.

function CertificateObject() {
  const rows = [
    { label: 'Issued to', value: 'Fahad Ali',  display: true },
    { label: 'For',       value: 'Docker',     display: true, sub: 'Advanced' },
  ];

  return (
    <div className="bg-paper-card border border-paper-rule rounded-2xl shadow-raised overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 sm:px-6 py-3.5 border-b border-paper-line">
        <span className="label">Certificate of verification</span>
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink-500 tabular-nums whitespace-nowrap shrink-0">SKL-2F91-A7C4-0Q</span>
      </div>

      <div className="px-5 sm:px-6 py-7">
        <div className="flex items-start gap-5">
          <SealMark size={56} tone="seal" className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-4 break-words">
            {rows.map(r => (
              <div key={r.label}>
                <p className="label">{r.label}</p>
                <p className="font-display text-[26px] leading-none text-ink-900 mt-1.5">
                  {r.value}
                  {r.sub && <span className="text-base text-ink-500 ml-2.5 font-sans font-semibold">{r.sub}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-7 pt-5 border-t border-paper-line">
          <div>
            <p className="label">Score</p>
            <p className="mt-1.5">
              <span className="font-mono text-2xl leading-none text-ink-900 tabular-nums">92</span>
              <span className="font-mono text-xs text-ink-400">/100</span>
            </p>
          </div>
          <div>
            <p className="label">Integrity</p>
            <p className="font-mono text-sm text-pass mt-2 leading-none">Clean</p>
          </div>
          <div>
            <p className="label">Valid to</p>
            <p className="font-mono text-sm text-ink-900 mt-2 leading-none tabular-nums">2028-03</p>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-3 bg-paper-sunk border-t border-paper-line">
        <p className="font-mono text-[11px] tracking-[0.04em] text-ink-500 truncate">
          Verified · skillseal.tech/verify/2F91A7C4
        </p>
      </div>
    </div>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-16 pb-14 lg:pt-24 lg:pb-20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] gap-14 lg:gap-16 items-center">
        <motion.div {...enterAt(0)} className="min-w-0">
          <p className="label-seal">Proctored skill credentials</p>

          <h1 className="font-display text-[44px] sm:text-[60px] leading-[0.98] tracking-[-0.02em] text-ink-900 mt-6">
            A skill claim anyone<br className="hidden sm:block" /> can look up.
          </h1>

          <p className="text-[17px] sm:text-[19px] leading-[1.6] text-ink-500 mt-6 max-w-[58ch]">
            Sit a monitored, adaptive assessment. Pass, and SkillSeal issues a certificate
            with a public verification page, a score, an integrity record and an expiry date.
            Recruiters check it in one click.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-9">
            <Link to="/register?role=candidate&redirect=/assessment" className="btn-seal">
              Verify my skills
            </Link>
            <Link to="/register?role=recruiter" className="btn-quiet">
              Hire verified talent
            </Link>
          </div>

          {/* Flex-wrap, not inline spans: JSX strips the whitespace between
              elements, which left the line with no break opportunity. */}
          <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] tracking-[0.08em] uppercase text-ink-400 mt-6">
            {['Free to start', 'No card required', 'Results in 40 minutes'].map((t, i) => (
              <li key={t} className="flex items-center gap-2.5 whitespace-nowrap">
                {i > 0 && <span className="text-ink-400" aria-hidden="true">·</span>}
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...enterAt(3)} className="min-w-0">
          <CertificateObject />
        </motion.div>
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section className="border-y border-paper-rule bg-paper-card">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-paper-line">
        {STATS.map(s => (
          <div key={s.label} className="py-7 lg:px-8 first:lg:pl-0 last:lg:pr-0">
            <p className="font-mono text-[32px] leading-none text-ink-900 tabular-nums">{s.value}</p>
            <p className="text-sm text-ink-500 mt-2.5 pr-4">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
      <div className="max-w-[52ch]">
        <h2 className="font-display text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-ink-900">
          How a seal is issued
        </h2>
        <p className="text-[17px] leading-relaxed text-ink-500 mt-3">Three steps, one artifact.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-paper-line border border-paper-line rounded-lg overflow-hidden mt-12">
        {STEPS.map((s, i) => (
          <motion.div key={s.n} {...enterAt(i)} className="bg-paper-card p-7">
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-seal-600">{s.n}</span>
            <h3 className="font-display text-[22px] leading-tight text-ink-900 mt-4 font-normal">{s.title}</h3>
            <p className="text-[15px] leading-relaxed text-ink-500 mt-3">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function SkillRegistry() {
  return (
    <section id="skills" className="border-y border-paper-rule bg-paper-card">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[52ch]">
            <h2 className="font-display text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-ink-900">
              The skill registry
            </h2>
            <p className="text-[17px] leading-relaxed text-ink-500 mt-3">
              Every skill is sat at one of four tiers. The tier is printed on the certificate.
            </p>
          </div>
          <p className="label">Beginner · Intermediate · Advanced · Expert</p>
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-paper-line border border-paper-line rounded-lg overflow-hidden mt-11">
          {REGISTRY.map(s => (
            <li key={s.name} className="bg-paper-card px-5 py-4 flex items-center gap-3">
              <SealMark size={20} tone="ink" className="shrink-0 opacity-60" />
              <span className="font-display text-[18px] text-ink-900 leading-none">{s.name}</span>
              <span className="label ml-auto">{s.area}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ForRecruiters() {
  return (
    <section id="recruiters" className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        <motion.div {...enterAt(0)}>
          <p className="label">For recruiters</p>
          <h2 className="font-display text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-ink-900 mt-5">
            Filter on proof, not on adjectives.
          </h2>
          <p className="text-[17px] leading-[1.6] text-ink-500 mt-5 max-w-[54ch]">
            Search the talent pool by verified skill, tier and score band. Every candidate opens
            with their full session audit — how long they took, what was flagged, and whether the
            answers looked AI-assisted.
          </p>
          <Link to="/register?role=recruiter" className="btn-quiet mt-8">
            See the recruiter view
          </Link>
        </motion.div>

        <motion.div {...enterAt(3)} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-paper-line flex items-center justify-between">
            <span className="label">Talent search</span>
            <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-400 tabular-nums">3 of 142</span>
          </div>
          <ul className="divide-y divide-paper-line">
            {SAMPLE_CANDIDATES.map(c => (
              <li key={c.name} className="flex items-center gap-3.5 px-5 py-4">
                <span className="w-9 h-9 rounded-full bg-ink-800 text-paper flex items-center justify-center font-mono text-[11px] shrink-0">
                  {c.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{c.name}</p>
                  <p className="text-xs text-ink-500 truncate">{c.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[11px] tracking-[0.04em] text-ink-700 tabular-nums">{c.seal} · {c.score}</p>
                  <p className={`font-mono text-[10px] tracking-[0.08em] uppercase mt-1 ${c.integrity === 'Clean' ? 'text-pass' : 'text-warn'}`}>
                    {c.integrity}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section className="bg-ink-900 text-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-10 items-end">
        <div>
          <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-seal-300">Sit a session</p>
          <h2 className="font-display text-[34px] sm:text-[44px] leading-[1.02] tracking-[-0.02em] text-paper mt-5 max-w-[20ch]">
            Stop asking people to take your word for it.
          </h2>
          <p className="text-[17px] leading-relaxed text-ink-300 mt-5 max-w-[54ch]">
            One assessment, one certificate, one permanent URL that a stranger can check.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/register?role=candidate&redirect=/assessment" className="btn-seal">
            Verify my skills
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded border border-ink-700 px-4 py-3 text-sm font-semibold text-paper hover:bg-ink-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-2.5">
          <SealMark size={22} tone="seal" />
          <span className="font-display font-medium text-base text-paper tracking-[-0.015em]">SkillSeal</span>
        </div>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase">Proctored skill credentials</p>
        <nav className="flex items-center gap-6 ml-auto text-sm">
          <Link to="/pricing" className="hover:text-paper transition-colors">Pricing</Link>
          <Link to="/privacy" className="hover:text-paper transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-paper transition-colors">Terms</Link>
        </nav>
      </div>
      <div className="border-t border-ink-800">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4">
          <p className="font-mono text-[10px] tracking-[0.08em] text-ink-300">
            © {new Date().getFullYear()} SkillSeal
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useSEO({
    description: 'Sit a monitored, adaptive assessment. Pass, and SkillSeal issues a certificate with a public verification page, a score, an integrity record and an expiry date.',
    canonical: '/',
  });

  return (
    <div className="min-h-screen bg-paper">
      <LandingNav />
      <main>
        <Hero />
        <StatsStrip />
        <HowItWorks />
        <SkillRegistry />
        <ForRecruiters />
        <ClosingBand />
      </main>
      <Footer />
    </div>
  );
}
