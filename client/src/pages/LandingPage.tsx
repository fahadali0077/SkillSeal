import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, CheckCircle2, Star,
  Users, Zap, Award, Lock, ChevronRight, Brain,
  Code2, Database, Globe, BarChart3, BadgeCheck
} from 'lucide-react';

// ── Animation helpers ─────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, ease: 'easeOut', delay },
});

// ── Data ──────────────────────────────────────────────────────────────────────
const SKILLS = [
  { icon: <Code2 size={28} className="text-blue-400" />, name: 'React', category: 'Frontend', tiers: ['Beginner', 'Intermediate', 'Advanced'], color: 'from-blue-500/10 to-blue-600/5' },
  { icon: <Globe size={28} className="text-green-400" />, name: 'Node.js', category: 'Backend', tiers: ['Intermediate', 'Advanced'], color: 'from-green-500/10 to-green-600/5' },
  { icon: <Database size={28} className="text-emerald-400" />, name: 'MongoDB', category: 'Database', tiers: ['Intermediate', 'Advanced'], color: 'from-emerald-500/10 to-emerald-600/5' },
];

const STEPS = [
  { n: '01', icon: <ShieldCheck size={22} className="text-brand" />, title: 'Pick a Skill & Tier', desc: 'Choose from verified skills at beginner, intermediate, or advanced level. Each tier has a different 20-question assessment.' },
  { n: '02', icon: <Brain size={22} className="text-brand" />, title: 'Take the AI Assessment', desc: 'Answer 20 adaptive questions — MCQ, scenario-based, and written theory — under real-time AI monitoring. No copy-paste allowed.' },
  { n: '03', icon: <BadgeCheck size={22} className="text-brand" />, title: 'Earn Your Verified Badge', desc: 'Score above the threshold and receive a publicly verifiable certificate. Share it on your profile and with recruiters.' },
];

const STATS = [
  { value: '20', label: 'Adaptive questions per assessment', icon: <BarChart3 size={20} /> },
  { value: 'AI', label: 'Anti-cheat monitoring built-in', icon: <Lock size={20} /> },
  { value: '3', label: 'Difficulty tiers per skill', icon: <Star size={20} /> },
  { value: '100%', label: 'Publicly verifiable certificates', icon: <Award size={20} /> },
];

const RECRUITER_FEATURES = [
  { icon: <Users size={18} className="text-brand" />, title: 'Search Verified Talent', desc: 'Filter candidates by skill, tier, and score. Every result is someone who actually proved it.' },
  { icon: <BarChart3 size={18} className="text-brand" />, title: 'Score Transparency', desc: 'See composite scores, speed, consistency, and anti-cheat signals — not just a pass/fail.' },
  { icon: <ShieldCheck size={18} className="text-brand" />, title: 'Anti-Cheat Audit Trail', desc: 'Full session audit: tab switches, paste attempts, timing anomalies — all logged and reviewable.' },
  { icon: <Zap size={18} className="text-brand" />, title: 'Pipeline Management', desc: 'Save candidates, build talent pipelines, and track your hiring funnel from search to offer.' },
];

// ── Navbar ────────────────────────────────────────────────────────────────────
function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-sm">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">SkillSeal</span>
        </Link>

        <div className="flex-1" />

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#how-it-works" className="hover:text-brand transition-colors">How it works</a>
          <a href="#skills" className="hover:text-brand transition-colors">Skills</a>
          <a href="#recruiters" className="hover:text-brand transition-colors">For Recruiters</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-8 backdrop-blur-sm">
          <ShieldCheck size={14} className="text-blue-300" />
          AI-Powered Skill Verification Platform
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
          Prove Your Skills.<br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Get Hired Faster.
          </span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="mt-6 text-xl text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
          SkillSeal verifies your technical skills through adaptive AI assessments.
          Earn a verified badge that recruiters can trust — not just a self-reported claim.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.3)} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register?role=candidate"
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-brand/30 text-base"
          >
            <ShieldCheck size={18} /> Verify My Skills
          </Link>
          <Link
            to="/register?role=recruiter"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20 backdrop-blur-sm text-base"
          >
            <Users size={18} /> Hire Verified Talent
          </Link>
        </motion.div>

        {/* Trust signals */}
        <motion.div {...fadeUp(0.4)} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200/70">
          {['Free to get started', 'No credit card required', 'Results in under 40 minutes'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-blue-400" /> {t}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s, i) => (
          <motion.div key={s.label} {...fadeUp(i * 0.1)} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-brand">{s.icon}</span>
              <span className="text-3xl font-extrabold text-gray-900">{s.value}</span>
            </div>
            <p className="text-sm text-gray-500">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div {...fadeUp()} className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-brand uppercase">How it works</span>
          <h2 className="mt-3 text-4xl font-extrabold text-gray-900">Three steps to a verified profile</h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            The whole process takes under 40 minutes. Your certificate is permanent and publicly verifiable.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div key={step.n} {...fadeUp(i * 0.15)} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-brand/30 to-transparent z-0 -translate-y-1/2" />
              )}
              <div className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-brand/30 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-brand/50 mb-3 tracking-widest">{step.n}</div>
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(0.4)} className="mt-12 text-center">
          <Link to="/register?role=candidate" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Start Verifying <ChevronRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────
function SkillsSection() {
  return (
    <section id="skills" className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <span className="text-xs font-bold tracking-widest text-brand uppercase">Available skills</span>
          <h2 className="mt-3 text-4xl font-extrabold text-gray-900">Verify what the market demands</h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            More skills added every quarter. Each skill has multiple difficulty tiers.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {SKILLS.map((skill, i) => (
            <motion.div key={skill.name} {...fadeUp(i * 0.12)}>
              <div className={`bg-gradient-to-br ${skill.color} border border-gray-200 rounded-2xl p-6 hover:border-brand/40 hover:shadow-lg transition-all group`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {skill.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{skill.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{skill.category}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {skill.tiers.map(tier => (
                    <span key={tier} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {tier}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <ShieldCheck size={12} className="text-brand" />
                  AI-monitored · Anti-cheat · Certified
                </div>

                <Link
                  to={`/register?role=candidate`}
                  className="w-full flex items-center justify-center gap-2 bg-brand text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
                >
                  Verify {skill.name} <ArrowRight size={14} />
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
    <section id="recruiters" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div {...fadeUp()}>
            <span className="text-xs font-bold tracking-widest text-brand uppercase">For Recruiters</span>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight">
              Hire with confidence,<br />not guesswork
            </h2>
            <p className="mt-4 text-gray-500 text-lg leading-relaxed">
              Every candidate on SkillSeal has taken a proctored, AI-monitored assessment.
              You see exactly what they scored, how fast they answered, and whether any anti-cheat
              flags were raised.
            </p>

            <ul className="mt-8 space-y-4">
              {RECRUITER_FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
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
              className="mt-10 inline-flex items-center gap-2 btn-primary px-6 py-3"
            >
              Start Finding Talent <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Right: mock dashboard card */}
          <motion.div {...fadeUp(0.2)} className="relative">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Talent Search</p>

              {/* Fake search bar */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-5 text-sm text-gray-400">
                <ShieldCheck size={14} className="text-brand" />
                React · Advanced · Score ≥ 80
              </div>

              {/* Fake candidate cards */}
              {[
                { name: 'Ahmed K.', skill: 'React Advanced', score: 94, tier: 'Advanced' },
                { name: 'Sara M.', skill: 'React Intermediate', score: 88, tier: 'Intermediate' },
                { name: 'John D.', skill: 'React Advanced', score: 82, tier: 'Advanced' },
              ].map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl mb-2 last:mb-0">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <BadgeCheck size={11} className="text-brand" />
                      <span className="text-xs text-gray-500">{c.skill}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${c.score >= 90 ? 'text-green-600' : 'text-brand'}`}>{c.score}%</span>
                    <p className="text-[10px] text-gray-400">Composite</p>
                  </div>
                </div>
              ))}

              <div className="mt-4 text-center text-xs text-gray-400">Showing 3 of 142 verified candidates</div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 bg-brand/5 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-blue-200/70 text-lg">
            Join SkillSeal — whether you're proving your skills or hiring the best.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Candidate card */}
          <motion.div {...fadeUp(0.1)} className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-all">
            <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center mb-5">
              <ShieldCheck size={24} className="text-blue-300" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">For Candidates</h3>
            <p className="text-blue-200/70 text-sm mb-6 leading-relaxed">
              Take a proctored AI assessment, earn a verified badge, and let your skills speak louder than your resume.
            </p>
            <ul className="space-y-2 mb-8">
              {['Free to start', '20-question adaptive test', 'Publicly shareable certificate', 'Stand out to recruiters'].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-blue-100/80">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link to="/register?role=candidate" className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl transition-colors">
              Verify My Skills <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Recruiter card */}
          <motion.div {...fadeUp(0.2)} className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-all">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-5">
              <Users size={24} className="text-indigo-300" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">For Recruiters</h3>
            <p className="text-blue-200/70 text-sm mb-6 leading-relaxed">
              Search a pool of candidates who actually proved their skills. Filter by score, tier, and anti-cheat signals.
            </p>
            <ul className="space-y-2 mb-8">
              {['Search verified talent instantly', 'View composite scores & audit trails', 'Build and manage pipelines', 'No more resume guesswork'].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-blue-100/80">
                  <CheckCircle2 size={14} className="text-indigo-400 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link to="/register?role=recruiter" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
              Find Verified Talent <ArrowRight size={16} />
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
    <footer className="bg-slate-950 border-t border-white/5 py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <span className="font-bold text-white">SkillSeal</span>
        </div>
        <p className="text-sm text-gray-600">© 2026 SkillSeal. All rights reserved.</p>
        <div className="flex items-center gap-5 text-sm text-gray-600">
          <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-gray-400 transition-colors">Terms</a>
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
