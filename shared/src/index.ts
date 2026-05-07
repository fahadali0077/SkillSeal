// ─────────────────────────────────────────────────────────────────────────────
// @SkillSeal/shared — single source of truth for all shared TypeScript types
//
// Both /client and /server import exclusively from this barrel.
// Never import directly from sub-files; always go through this index.
// ─────────────────────────────────────────────────────────────────────────────

// ── User & Auth ───────────────────────────────────────────────────────────────
export type {
  UserRole,
  AccountType,
  SkillStatus,
  ConnectionStatus,
  EmploymentTypeValue,
  LinkType,
  ISkillEntry,
  IDateRange,
  IExperience,
  IEducation,
  ILink,
  ILocation,
  IUserPublic,
  IUserPrivate,
  ILoginPayload,
  IRegisterPayload,
  ITokenPayload,
  IAuthResponse,
} from './types/user.types';

// ── Verification & Certification ──────────────────────────────────────────────
export type {
  VerificationStatus,
  SkillTier,
  QuestionType,
  SessionStatus,
  IScoreBreakdown,
  IVerification,
  ICertificate,
  ISessionState,
} from './types/verification.types';

// ── Assessment (quiz engine) ──────────────────────────────────────────────────
export type {
  QuestionDifficulty,
  IQuestion,
  IQuestionMutation,
  IAnswerSubmission,
  AntiCheatEventType,
  IAntiCheatEvent,
  IAnswerResult,
  ISessionResult,
} from './types/assessment.types';

// ── Feed & Social ─────────────────────────────────────────────────────────────
export type {
  PostType,
  ReactionType,
  PostVisibility,
  IPostAuthor,
  IPollOption,
  ILinkPreview,
  IVerificationBadge,
  IReactionSummary,
  IComment,
  IPost,
  IPostCard,
} from './types/feed.types';

// ── Jobs & Applications ───────────────────────────────────────────────────────
export type {
  EmploymentType,
  WorkType,
  JobStatus,
  ApplicationStatus,
  PipelineStatus,
  IRequiredSkill,
  ISalaryRange,
  IJobCompany,
  IJob,
  IJobCard,
  IApplication,
  IPipelineStatus,
} from './types/job.types';

export { PIPELINE_STAGES } from './types/job.types';

// ── Messaging ─────────────────────────────────────────────────────────────────
export type {
  AttachmentType,
  IAttachment,
  IMessageReaction,
  IParticipant,
  IMessage,
  IThread,
  IMessageThread,
  ISendMessagePayload,
  IMarkReadPayload,
} from './types/messaging.types';

// ── API Contracts ─────────────────────────────────────────────────────────────
export type {
  IFieldError,
  IApiSuccess,
  IApiError,
  IApiResponse,
  IPaginationMeta,
  IPaginatedResponse,
  ICursorPaginatedResponse,
  IPaginationQuery,
} from './types/api.types';

export { ApiErrorCode, isApiSuccess, isApiError } from './types/api.types';

// ── Recruiter ─────────────────────────────────────────────────────────────────
export type {
  IVerifiedSkillBadge,
  ICandidateCard,
  IBehaviorIntegrity,
  IPipelineEntry,
  AuditAction,
  IAuditTrail,
  IRecruiterDashboard,
  ICandidateSearchFilters,
} from './types/recruiter.types';
