import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, CheckCircle2, Star,
  Users, Zap, Award, Lock, ChevronRight, Brain,
  Code2, Database, Globe, BarChart3, BadgeCheck, Menu, X,
} from 'lucide-react';

// ── Animation helpers ─────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: 'easeOut', delay },
});

// ── Data ──────────────────────────────────────────────────────────────────────
const SKILLS = [
  { icon: <Code2 size={26} className="text-blue-400" />, name: 'React', category: 'Frontend', tiers: ['Beginner', 'Intermediate', 'Advanced'], color: 'from-blue-500/10 to-blue-600/5' },
  { icon: <Globe size={26} className="text-green-400" />, name: 'Node.js', category: 'Backend', tiers: ['Intermediate', 'Advanced'], color: 'from-green-500/10 to-green-600/5' },
  { icon: <Database size={26} className="text-emerald-400" />, name: 'MongoDB', category: 'Database', tiers: ['Intermediate', 'Advanced'], color: 'from-emerald-500/10 to-emerald-600/5' },
];

const STEPS = [
  { n: '01', icon: <ShieldCheck size={20} className="text-brand" />, title: 'Pick a Skill & Tier', desc: 'Choose from verified skills at beginner, intermediate, or advanced level. Each tier has a different 20-question adaptive assessment.' },
  { n: '02', icon: <Brain size={20} className="text-brand" />, title: 'Take the AI Assessment', desc: 'Answer 20 adaptive questions — MCQ, scenario-based, and written theory — under real-time AI monitoring. No copy-paste allowed.' },
  { n: '03', icon: <BadgeCheck size={20} className="text-brand" />, title: 'Earn Your Verified Badge', desc: 'Score above the threshold and receive a publicly verifiable certificate. Share it on your profile and with recruiters.' },
];

const STATS = [
  { value: '20', label: 'Questions per assessment', icon: <BarChart3 size={18} /> },
  { value: 'AI', label: 'Anti-cheat monitoring', icon: <Lock size={18} /> },
  { value: '3', label: 'Difficulty tiers', icon: <Star size={18} /> },
  { value: '100%', label: 'Verifiable certificates', icon: <Award size={18} /> },
];

const RECRUITER_FEATURES = [
  { icon: <Users size={16} className="text-brand" />, title: 'Search Verified Talent', desc: 'Filter candidates by skill, tier, and score. Every result is someone who actually proved it.' },
  { icon: <BarChart3 size={16} className="text-brand" />, title: 'Score Transparency', desc: 'See composite scores, speed, consistency, and anti-cheat signals — not just a pass/fail.' },
  { icon: <ShieldCheck size={16} className="text-brand" />, title: 'Anti-Cheat Audit Trail', desc: 'Full session audit: tab switches, paste attempts, and timing anomalies — all logged.' },
  { icon: <Zap size={16} className="text-brand" />, title: 'Pipeline Management', desc: 'Save candidates, build talent pipelines, and track your hiring funnel from search to offer.' },
];

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#skills', label: 'Skills' },
  { href: '#recruiters', label: 'For Recruiters' },
];

// ── Navbar ────────────────────────────────────────────────────────────────────
function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-sm">
            <ShieldCheck size={17} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">SkillSeal</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="hover:text-brand transition-colors">{l.label}</a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
            Get Started <ArrowRight size={13} />
          </Link>
        </div>

        {/* Mobile: compact Sign in + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors px-2 py-1.5">
            Sign in
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="md:hidden overflow-hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-gray-700 hover:text-brand hover:bg-gray-50 rounded-lg px-3 py-2.5 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                <Link
                  to="/register?role=candidate&redirect=/assessment"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-brand text-white font-semibold text-sm py-3 rounded-xl"
                >
                  <ShieldCheck size={15} /> Verify My Skills
                </Link>
                <Link
                  to="/register?role=recruiter"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl"
                >
                  <Users size={15} /> Hire Verified Talent
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-28 pb-20 sm:pt-32 sm:pb-24 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      {/* Background glow — capped so it never causes horizontal scroll */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 bg-brand/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs sm:text-sm text-blue-200 mb-6 sm:mb-8 backdrop-blur-sm">
          <ShieldCheck size={13} className="text-blue-300" />
          AI-Powered Skill Verification Platform
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
          Verify Your Skills.
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Get Hired Faster.
          </span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="mt-5 sm:mt-6 text-base sm:text-xl text-blue-100/80 max-w-2xl mx-auto leading-relaxed px-2">
          SkillSeal lets you verify your skills online through AI-powered adaptive assessments.
          Earn a verified badge that proves your expertise — not a self-reported claim recruiters have to guess at.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.3)} className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
          <Link
            to="/register?role=candidate&redirect=/assessment"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl transition-all shadow-lg shadow-brand/30 text-sm sm:text-base"
          >
            <ShieldCheck size={17} /> Verify My Skills
          </Link>
          <Link
            to="/register?role=recruiter"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl transition-all border border-white/20 backdrop-blur-sm text-sm sm:text-base"
          >
            <Users size={17} /> Hire Verified Talent
          </Link>
        </motion.div>

        {/* Trust signals */}
        <motion.div {...fadeUp(0.4)} className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-blue-200/70 px-2">
          {['Free to get started', 'No credit card required', 'Results in under 40 minutes'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-blue-400 shrink-0" /> {t}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
        {STATS.map((s, i) => (
          <motion.div key={s.label} {...fadeUp(i * 0.08)} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-brand">{s.icon}</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">{s.value}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 leading-snug">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp()} className="text-center mb-10 sm:mb-16">
          <span className="text-xs font-bold tracking-widest text-brand uppercase">How to verify your skills</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900">Verify your skills in three steps</h2>
          <p className="mt-3 sm:mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
            The whole process takes under 40 minutes. Your certificate is permanent and publicly verifiable.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {STEPS.map((step, i) => (
            <motion.div key={step.n} {...fadeUp(i * 0.12)} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-brand/30 to-transparent z-0 -translate-y-1/2" />
              )}
              <div className="relative bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-brand/30 hover:shadow-md transition-all h-full">
                <div className="text-xs font-bold text-brand/50 mb-2 tracking-widest">{step.n}</div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  {step.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(0.4)} className="mt-10 sm:mt-12 text-center">
          <Link to="/register?role=candidate&redirect=/assessment" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Start Verifying <ChevronRight size={15} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────
function SkillsSection() {
  return (
    <section id="skills" className="py-16 sm:py-24 bg-gray-50 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp()} className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-bold tracking-widest text-brand uppercase">Skills you can verify</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900">Verify the skills the market demands</h2>
          <p className="mt-3 sm:mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
            More skills added every quarter. Each skill has multiple difficulty tiers.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {SKILLS.map((skill, i) => (
            <motion.div key={skill.name} {...fadeUp(i * 0.1)}>
              <div className={`bg-gradient-to-br ${skill.color} border border-gray-200 rounded-2xl p-5 sm:p-6 hover:border-brand/40 hover:shadow-lg transition-all h-full flex flex-col`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    {skill.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base sm:text-lg">{skill.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{skill.category}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
                  {skill.tiers.map(tier => (
                    <span key={tier} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {tier}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 mt-auto">
                  <ShieldCheck size={11} className="text-brand shrink-0" />
                  AI-monitored · Anti-cheat · Certified
                </div>

                <Link
                  to="/register?role=candidate&redirect=/assessment"
                  className="w-full flex items-center justify-center gap-2 bg-brand text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
                >
                  Verify {skill.name} <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── For Recruiters ────────────────────────────────────────────────────────────
function ForRecruiters() {
  return (
    <section id="recruiters" className="py-16 sm:py-24 bg-white scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-14 md:gap-16 items-center">
          {/* Left: copy */}
          <motion.div {...fadeUp()}>
            <span className="text-xs font-bold tracking-widest text-brand uppercase">For Recruiters</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Hire with confidence,<br className="hidden sm:block" />not guesswork
            </h2>
            <p className="mt-3 sm:mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
              Every candidate on SkillSeal has taken a proctored, AI-monitored assessment.
              You see exactly what they scored, how fast they answered, and whether any
              anti-cheat flags were raised.
            </p>

            <ul className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              {RECRUITER_FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              to="/register?role=recruiter"
              className="mt-8 sm:mt-10 inline-flex items-center gap-2 btn-primary px-6 py-3"
            >
              Start Finding Talent <ArrowRight size={15} />
            </Link>
          </motion.div>

          {/* Right: mock dashboard */}
          <motion.div {...fadeUp(0.2)} className="relative">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">Talent Search</p>

              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 mb-4 sm:mb-5 text-xs sm:text-sm text-gray-400">
                <ShieldCheck size={13} className="text-brand shrink-0" />
                React · Advanced · Score ≥ 80
              </div>

              {[
                { name: 'Ahmed K.', skill: 'React Advanced', score: 94 },
                { name: 'Sara M.', skill: 'React Intermediate', score: 88 },
                { name: 'John D.', skill: 'React Advanced', score: 82 },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl mb-2 last:mb-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs sm:text-sm shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <BadgeCheck size={10} className="text-brand shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{c.skill}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${c.score >= 90 ? 'text-green-600' : 'text-brand'}`}>{c.score}%</span>
                    <p className="text-[10px] text-gray-400">Score</p>
                  </div>
                </div>
              ))}

              <div className="mt-3 sm:mt-4 text-center text-xs text-gray-400">Showing 3 of 142 verified candidates</div>
            </div>
            <div className="absolute -inset-3 sm:-inset-4 bg-brand/5 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp()} className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Ready to get started?
          </h2>
          <p className="mt-3 sm:mt-4 text-blue-200/70 text-base sm:text-lg">
            Join SkillSeal — whether you're proving your skills or hiring the best.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Candidate card */}
          <motion.div {...fadeUp(0.1)} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-all">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-brand/20 rounded-xl flex items-center justify-center mb-4 sm:mb-5">
              <ShieldCheck size={22} className="text-blue-300" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">For Candidates</h3>
            <p className="text-blue-200/70 text-sm mb-5 sm:mb-6 leading-relaxed">
              Take a proctored AI assessment, earn a verified badge, and let your skills speak louder than your resume.
            </p>
            <ul className="space-y-2 mb-6 sm:mb-8">
              {['Free to start', '20-question adaptive test', 'Publicly shareable certificate', 'Stand out to recruiters'].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-blue-100/80">
                  <CheckCircle2 size={13} className="text-blue-400 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link to="/register?role=candidate&redirect=/assessment" className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl transition-colors text-sm sm:text-base">
              Verify My Skills <ArrowRight size={15} />
            </Link>
          </motion.div>

          {/* Recruiter card */}
          <motion.div {...fadeUp(0.2)} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-all">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 sm:mb-5">
              <Users size={22} className="text-indigo-300" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">For Recruiters</h3>
            <p className="text-blue-200/70 text-sm mb-5 sm:mb-6 leading-relaxed">
              Search a pool of candidates who actually proved their skills. Filter by score, tier, and anti-cheat signals.
            </p>
            <ul className="space-y-2 mb-6 sm:mb-8">
              {['Search verified talent instantly', 'View composite scores & audit trails', 'Build and manage pipelines', 'No more resume guesswork'].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-blue-100/80">
                  <CheckCircle2 size={13} className="text-indigo-400 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link to="/register?role=recruiter" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm sm:text-base">
              Find Verified Talent <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">SkillSeal</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">© 2026 SkillSeal. All rights reserved.</p>
        <div className="flex items-center gap-4 sm:gap-5 text-xs sm:text-sm text-gray-600">
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
          <Link to="/login" className="hover:text-gray-400 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <SkillsSection />
      <ForRecruiters />
      <CTASection />
      <Footer />
    </div>
  );
}
