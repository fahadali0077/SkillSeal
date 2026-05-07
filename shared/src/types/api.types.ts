// ─────────────────────────────────────────────────────────────────────────────
// api.types.ts
// Shared API contract types — all HTTP responses follow these shapes
// ─────────────────────────────────────────────────────────────────────────────

// ── Field-level validation error ──────────────────────────────────────────────

export interface IFieldError {
  field: string;
  message: string;
  value?: string;          // echoed back for debugging (never passwords)
}

// ── Success envelope ──────────────────────────────────────────────────────────

export interface IApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;   // optional extra metadata (e.g. rate limit info)
}

// ── Error envelope ────────────────────────────────────────────────────────────

export interface IApiError {
  success: false;
  message: string;
  code: ApiErrorCode;
  errors?: IFieldError[];           // populated for validation failures
  stack?: string;                   // only in development NODE_ENV
}

// ── Union response (useful for client-side type narrowing) ────────────────────

export type IApiResponse<T> = IApiSuccess<T> | IApiError;

// ── Paginated response ────────────────────────────────────────────────────────

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  pagination: IPaginationMeta;
}

// ── Cursor paginated response (for real-time feeds / messaging) ───────────────

export interface ICursorPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Standard query params ─────────────────────────────────────────────────────

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ── API error codes (exhaustive enum) ────────────────────────────────────────
// Used by both server (when constructing errors) and client (when handling them).

export enum ApiErrorCode {
  // ── Auth ──────────────────────────────────────────────────
  UNAUTHORIZED            = 'AUTH_001',   // no / missing token
  INVALID_TOKEN           = 'AUTH_002',   // malformed JWT
  TOKEN_EXPIRED           = 'AUTH_003',   // JWT exp passed
  REFRESH_TOKEN_INVALID   = 'AUTH_004',
  EMAIL_NOT_VERIFIED      = 'AUTH_005',
  INVALID_CREDENTIALS     = 'AUTH_006',   // wrong email or password
  TOKEN_VERSION_MISMATCH  = 'AUTH_007',   // tokenVersion invalidated (logout all)
  ACCOUNT_SUSPENDED       = 'AUTH_008',

  // ── Authorization ─────────────────────────────────────────
  FORBIDDEN               = 'AUTHZ_001',  // authenticated but not allowed
  ROLE_INSUFFICIENT       = 'AUTHZ_002',
  ACCOUNT_TYPE_REQUIRED   = 'AUTHZ_003',  // feature needs pro/recruiter

  // ── Validation ────────────────────────────────────────────
  VALIDATION_ERROR        = 'VAL_001',    // body / query / param failed schema
  MISSING_REQUIRED_FIELD  = 'VAL_002',
  INVALID_FIELD_VALUE     = 'VAL_003',
  FILE_TOO_LARGE          = 'VAL_004',
  UNSUPPORTED_FILE_TYPE   = 'VAL_005',

  // ── Resource ──────────────────────────────────────────────
  NOT_FOUND               = 'RES_001',
  ALREADY_EXISTS          = 'RES_002',
  CONFLICT                = 'RES_003',

  // ── User / Profile ────────────────────────────────────────
  USER_NOT_FOUND          = 'USR_001',
  EMAIL_IN_USE            = 'USR_002',
  CUSTOM_URL_TAKEN        = 'USR_003',
  BLOCKED_BY_USER         = 'USR_004',
  CANNOT_SELF_CONNECT     = 'USR_005',

  // ── Skills & Verification ─────────────────────────────────
  SKILL_NOT_FOUND         = 'SKL_001',
  SKILL_ALREADY_ADDED     = 'SKL_002',
  VERIFICATION_IN_PROGRESS= 'VER_001',    // session already active for this skill
  VERIFICATION_COOLDOWN   = 'VER_002',    // must wait N days before retrying
  SESSION_NOT_FOUND       = 'VER_003',
  SESSION_EXPIRED         = 'VER_004',
  SESSION_TERMINATED      = 'VER_005',
  INVALID_ANSWER          = 'VER_006',
  CERTIFICATE_NOT_FOUND   = 'VER_007',

  // ── Anti-cheat ────────────────────────────────────────────
  STRIKE_LIMIT_REACHED    = 'ACE_001',
  SUSPICIOUS_BEHAVIOR     = 'ACE_002',
  AI_ASSIST_DETECTED      = 'ACE_003',

  // ── Posts & Feed ──────────────────────────────────────────
  POST_NOT_FOUND          = 'PST_001',
  POST_DELETED            = 'PST_002',
  CANNOT_EDIT_OTHERS_POST = 'PST_003',

  // ── Messaging ─────────────────────────────────────────────
  THREAD_NOT_FOUND        = 'MSG_001',
  MESSAGE_NOT_FOUND       = 'MSG_002',
  INMAIL_LIMIT_REACHED    = 'MSG_003',

  // ── Jobs ──────────────────────────────────────────────────
  JOB_NOT_FOUND           = 'JOB_001',
  JOB_CLOSED              = 'JOB_002',
  ALREADY_APPLIED         = 'JOB_003',

  // ── Rate limiting ─────────────────────────────────────────
  RATE_LIMIT_EXCEEDED     = 'RTL_001',

  // ── Server ────────────────────────────────────────────────
  INTERNAL_ERROR          = 'SRV_001',
  SERVICE_UNAVAILABLE     = 'SRV_002',
  DATABASE_ERROR          = 'SRV_003',
  AI_SERVICE_ERROR        = 'SRV_004',
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export function isApiSuccess<T>(
  response: IApiResponse<T>
): response is IApiSuccess<T> {
  return response.success === true;
}

export function isApiError<T>(
  response: IApiResponse<T>
): response is IApiError {
  return response.success === false;
}
