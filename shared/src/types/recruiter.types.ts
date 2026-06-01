// ─────────────────────────────────────────────────────────────────────────────
// recruiter.types.ts
// Recruiter-facing types: candidate search, pipeline, audit trail
// ─────────────────────────────────────────────────────────────────────────────

import type { SkillTier, VerificationStatus } from './verification.types';
import type { PipelineStatus, ApplicationStatus } from './job.types';
import type { AccountType, UserRole } from './user.types';

// ── Verified skill badge (on candidate card) ──────────────────────────────────

export interface IVerifiedSkillBadge {
  skillId: string;
  skillName: string;
  skillSlug: string;
  tier: SkillTier;
  compositeScore: number;
  status: VerificationStatus;
  issuedAt: string;
  expiresAt: string;
}

// ── Candidate card (search result format) ────────────────────────────────────
// A recruiter-optimised projection of a candidate profile.
// Does NOT include email, blockedUsers, or tokenVersion.

export interface ICandidateCard {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  headline: string;
  profilePhoto: string;
  customUrl: string;
  location: {
    city: string;
    country: string;
  };
  accountType: AccountType;
  openToWork: boolean;
  verifiedSkills: IVerifiedSkillBadge[];      // only verified skills shown
  topSkillNames: string[];                    // top 5 skill names for quick scan
  connectionCount: number;
  currentRole: {                              // most recent experience entry
    title: string;
    company: string;
  } | null;
  education: {                               // most recent education entry
    institution: string;
    degree: string;
    field: string;
  } | null;
  matchScore: number | null;                 // 0–100; null if not yet computed
  hasApplied: boolean;                       // applied to the job being viewed
  isSaved: boolean;                          // recruiter bookmarked this candidate
}

// ── Behavior integrity summary ────────────────────────────────────────────────
// Recruiter-visible signal about the integrity of verifications.

export interface IBehaviorIntegrity {
  userId: string;
  overallIntegrityScore: number;             // 0–100 aggregate across sessions
  aiProbabilityAvg: number;                  // 0–1 average AI-assist probability
  flaggedSessionCount: number;
  totalSessionCount: number;
  lastAssessedAt: string | null;
  integrityLabel: 'high' | 'medium' | 'low' | 'flagged';
  // Per-skill breakdown
  skillIntegrity: {
    skillId: string;
    skillName: string;
    behaviorScore: number;
    aiProbability: number;
    sessionCount: number;
  }[];
}

// ── Pipeline entry (kanban card) ──────────────────────────────────────────────

export interface IPipelineEntry {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidate: ICandidateCard;
  applicationStatus: ApplicationStatus;
  pipelineStatus: PipelineStatus;
  appliedAt: string;
  lastActivityAt: string;
  recruiterNotes: string;
  matchScore: number | null;
  integrityLabel: IBehaviorIntegrity['integrityLabel'];
  tags: string[];                            // recruiter-applied labels
}

// ── Audit trail entry ─────────────────────────────────────────────────────────
// Immutable log of recruiter actions on a candidate or application.

export type AuditAction =
  | 'application_viewed'
  | 'candidate_shortlisted'
  | 'candidate_rejected'
  | 'pipeline_stage_changed'
  | 'note_added'
  | 'note_edited'
  | 'candidate_saved'
  | 'candidate_unsaved'
  | 'message_sent'
  | 'interview_scheduled'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined';

export interface IAuditTrail {
  _id: string;
  recruiterId: string;
  recruiterName: string;
  candidateId: string;
  applicationId: string | null;
  jobId: string | null;
  action: AuditAction;
  previousValue: string | null;             // e.g. previous pipeline stage
  newValue: string | null;                  // e.g. new pipeline stage
  note: string;
  performedAt: string;                      // ISO date string
}

// ── Recruiter dashboard summary ───────────────────────────────────────────────

export interface IRecruiterDashboard {
  totalActiveJobs: number;
  totalApplications: number;
  newApplicationsToday: number;
  pipelineBreakdown: Record<PipelineStatus, number>;
  recentActivity: IAuditTrail[];
  savedCandidateCount: number;
}

// ── Candidate search filters ──────────────────────────────────────────────────

export interface ICandidateSearchFilters {
  skills?: { skillId: string; minTier: SkillTier }[];
  location?: { city?: string; country?: string };
  openToWork?: boolean;
  accountType?: AccountType;
  role?: UserRole;
  minMatchScore?: number;
  integrityLabel?: IBehaviorIntegrity['integrityLabel'];
  keywords?: string;
  page?: number;
  limit?: number;
}
