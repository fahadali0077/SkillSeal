import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useSEO } from '../lib/useSEO';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: `By creating an account or using SkillSeal (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users — candidates, recruiters, and company administrators.`,
  },
  {
    title: 'Account Registration',
    body: `You must provide accurate, current, and complete information during registration. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You must be at least 16 years old to use the Service.`,
  },
  {
    title: 'Assessment Rules & Integrity',
    body: `Assessments on SkillSeal are proctored and monitored for integrity violations. You must not: use AI tools or external resources during an assessment; share assessment questions with others; attempt to circumvent the anti-cheat system; create multiple accounts to retake assessments during a cooldown period. Violation of these rules will result in immediate session termination, score invalidation, and may result in permanent account suspension.`,
  },
  {
    title: 'Certificates & Verification',
    body: `Certificates issued by SkillSeal represent that you completed an assessment under monitored conditions and achieved the stated score. They do not constitute professional licensure. SkillSeal reserves the right to revoke a certificate if it determines the assessment was completed in violation of these terms.`,
  },
  {
    title: 'Recruiter Use',
    body: `Recruiters may view public candidate profiles and verified certificates for the purpose of evaluating candidates for employment. You may not use candidate data for any purpose other than recruitment, resell the data, or store it beyond what is necessary for your hiring process. You must comply with applicable employment and data protection laws.`,
  },
  {
    title: 'Prohibited Conduct',
    body: `You agree not to: scrape or crawl the platform; attempt to gain unauthorised access to any system or account; upload malicious content; harass or abuse other users; use the Service to engage in any unlawful activity; reverse-engineer the platform.`,
  },
  {
    title: 'Intellectual Property',
    body: `All content on SkillSeal — including assessment questions, scoring algorithms, UI, and branding — is the intellectual property of SkillSeal or its licensors. You may not reproduce, distribute, or create derivative works without express written permission.`,
  },
  {
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by law, SkillSeal is not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: 'Termination',
    body: `We may suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately.`,
  },
  {
    title: 'Changes to Terms',
    body: `We may update these terms from time to time. We will notify you of material changes by email or by posting a banner on the platform. Continued use after the effective date constitutes acceptance of the revised terms.`,
  },
  {
    title: 'Governing Law',
    body: `These terms are governed by the laws of Pakistan. Any disputes shall be resolved in the courts of Lahore, Punjab, Pakistan, unless otherwise required by applicable consumer protection law in your jurisdiction.`,
  },
];

export default function TermsPage() {
  useSEO({ title: 'Terms of Service', description: 'The rules and guidelines for using SkillSeal.', canonical: '/terms' });

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-4xl font-extrabold text-gray-900">Terms of Service</h1>
          <p className="mt-3 text-gray-500">Effective date: 1 January 2026 · Last updated: 10 May 2026</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Please read these Terms of Service carefully before using SkillSeal. These terms form a legally binding agreement between you and SkillSeal.
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
            Questions about these terms? Email us at{' '}
            <a href="mailto:legal@skillseal.tech" className="text-blue-700 font-medium hover:underline">
              legal@skillseal.tech
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
