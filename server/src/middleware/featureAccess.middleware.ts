import type { Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import type { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';
import { ApiErrorCode } from '@SkillSeal/shared';
export type Feature = 'unlimited_verifications' | 'inmail' | 'recruiter_dashboard' | 'profile_views' | 'profile_boost' | 'csv_export';
const FEATURE_LABEL: Record<Feature, string> = {
  unlimited_verifications: 'Unlimited verifications', inmail: 'InMail messaging',
  recruiter_dashboard: 'Recruiter dashboard', profile_views: 'Profile view tracking',
  profile_boost: 'Profile boost', csv_export: 'CSV export',
};
function hasAccess(accountType: string, feature: Feature): boolean {
  switch (feature) {
    case 'unlimited_verifications': case 'inmail': case 'profile_views': case 'profile_boost':
      return accountType === 'pro' || accountType === 'recruiter';
    case 'recruiter_dashboard': case 'csv_export': return accountType === 'recruiter';
    default: return false;
  }
}
export function checkFeatureAccess(feature: Feature) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.userId) { sendError(res, 'Authentication required.', 401, ApiErrorCode.UNAUTHORIZED); return; }
    const user = await User.findById(req.user.userId).select('accountType subscriptionStatus').lean<{ accountType: string; subscriptionStatus: string }>();
    if (!user) { sendError(res, 'User not found.', 404, ApiErrorCode.NOT_FOUND); return; }
    if (hasAccess(user.accountType, feature)) { next(); return; }
    sendError(res, `${FEATURE_LABEL[feature]} requires a paid plan.`, 403, ApiErrorCode.FORBIDDEN, { upgradeUrl: '/pricing', feature });
  };
}
