import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useSEO } from '../lib/useSEO';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: `When you register, we collect your name, email address, and chosen role (candidate or recruiter). During an assessment we collect your answers, response times, and session event logs (tab switches, window blur events, paste attempts) to enforce our anti-cheat policy. We do not collect your screen content, microphone, or camera.`,
  },
  {
    title: 'How We Use Your Information',
    body: `Your personal data is used to operate and improve SkillSeal: to run assessments, issue verifiable certificates, match candidates with recruiters, send transactional emails (verification, password reset), and detect policy violations. We do not sell your data to third parties or use it for advertising.`,
  },
  {
    title: 'Assessment Data & Certificates',
    body: `Your assessment results — including composite score, speed score, consistency score, and anti-cheat signals — are stored permanently and form the basis of your public certificate. Recruiters can view your certificate via its public verification link. You may request deletion of your account and associated data at any time by contacting support.`,
  },
  {
    title: 'Data Storage & Security',
    body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Session state is held temporarily in Redis and flushed after each assessment. Long-term data is stored in MongoDB Atlas (EU/US region). We apply role-based access controls so only authorised services can read your data.`,
  },
  {
    title: 'Cookies & Local Storage',
    body: `We store your authentication token in browser local storage to keep you signed in. We do not use third-party tracking cookies or analytics cookies. Essential session cookies may be set by our infrastructure provider.`,
  },
  {
    title: 'Your Rights',
    body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at privacy@skillseal.tech. We will respond within 30 days. If you are in the EEA, you also have the right to lodge a complaint with your local data protection authority.`,
  },
  {
    title: 'Changes to This Policy',
    body: `We may update this policy from time to time. Material changes will be communicated by email and by posting a notice on the platform. Continued use after changes take effect constitutes acceptance of the revised policy.`,
  },
];

export default function PrivacyPage() {
  useSEO({ title: 'Privacy Policy', description: 'How SkillSeal collects, uses, and protects your personal data.', canonical: '/privacy' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            SkillSeal
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
          <p className="mt-3 text-gray-500">Effective date: 1 January 2026 · Last updated: 10 May 2026</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            SkillSeal ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") is committed to protecting your
            personal information. This policy explains what we collect, why we collect it, and how we keep it safe.
          </p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                <span className="text-blue-700 mr-2">{String(i + 1).padStart(2, '0')}.</span>
                {s.title}
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-14 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-sm text-gray-700">
            Questions about this policy? Email us at{' '}
            <a href="mailto:privacy@skillseal.tech" className="text-blue-700 font-medium hover:underline">
              privacy@skillseal.tech
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
