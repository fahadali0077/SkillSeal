// ─────────────────────────────────────────────────────────────────────────────
// user.types.ts
// Shared user domain types for SkillSeal client & server
// ─────────────────────────────────────────────────────────────────────────────

// ── Enumerations ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'candidate'
  | 'recruiter'
  | 'company_admin'
  | 'platform_admin';

export type AccountType = 'free' | 'pro' | 'recruiter';

export type SkillStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'flagged';

export type ConnectionStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'none'; // no relationship yet

export type EmploymentTypeValue =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'freelance'
  | 'internship'
  | 'volunteer'
  | 'other';

export type LinkType =
  | 'github'
  | 'linkedin'
  | 'portfolio'
  | 'twitter'
  | 'other';

// ── Embedded sub-types ────────────────────────────────────────────────────────

export interface ISkillEntry {
  skillId: string;
  skillName: string;       // denormalised for display without extra fetch
  skillSlug: string;
  status: SkillStatus;
  verificationId: string | null;
  addedAt: string;         // ISO date string
}

export interface IDateRange {
  month: number;
  year: number;
}

export interface IExperience {
  _id: string;
  title: string;
  company: string;
  companyId: string | null;
  employmentType: EmploymentTypeValue;
  startDate: IDateRange;
  endDate: IDateRange & { isCurrent: boolean };
  location: string;
  description: string;
  skillsUsed: string[];    // skill IDs
}

export interface IEducation {
  _id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number | null;
  inProgress: boolean;
  grade: string;
  description: string;
}

export interface ILink {
  label: string;
  url: string;
  type: LinkType;
}

export interface ILocation {
  city: string;
  country: string;
}

// ── Public user shape (safe for API responses) ────────────────────────────────
// Never include passwordHash, tokenVersion, or other sensitive fields.

export interface IUserPublic {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;           // virtual — computed by server
  headline: string;
  summary: string;
  location: ILocation;
  profilePhoto: string;
  bannerImage: string;
  customUrl: string;
  role: UserRole;
  accountType: AccountType;
  openToWork: boolean;
  isHiring: boolean;
  skills: ISkillEntry[];
  experience: IExperience[];
  education: IEducation[];
  links: ILink[];
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  connectionStatus: ConnectionStatus; // relative to the requesting user
  connectionId?: string;        // the Connection doc _id — set when status is pending or accepted
  isFollowing: boolean;         // true if the requesting user follows this profile
  createdAt: string;
  updatedAt: string;
}

// ── Private user shape (self-view only) ───────────────────────────────────────
// Extends public with fields visible only to the account owner.

export interface IUserPrivate extends IUserPublic {
  email: string;
  emailVerified: boolean;
  blockedUsers: string[];      // user IDs
  tokenVersion: number;        // JWT invalidation counter — never expose in feed
}

// ── Auth payloads ─────────────────────────────────────────────────────────────

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface IAuthResponse {
  user: IUserPrivate;
  accessToken: string;
}