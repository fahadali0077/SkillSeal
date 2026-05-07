/**
 * @SkillSeal/server – Mongoose model exports
 * Import from here to avoid circular references and duplication.
 *
 * Usage:
 *   import { User, Skill, Session } from '../models';
 */

export { User } from './User.model';
export type { IUserDocument } from './User.model';

export { Skill } from './Skill.model';
export type { ISkillDocument } from './Skill.model';

export { Session } from './Session.model';
export type { ISessionDocument, IViolationLog } from './Session.model';

export { Answer } from './Answer.model';
export type { IAnswerDocument } from './Answer.model';

export { Verification } from './Verification.model';
export type { IVerificationDocument } from './Verification.model';

export { Post } from './Post.model';
export type { IPostDocument, ILike, ILinkPreview, IPollOption } from './Post.model';

export { Connection } from './Connection.model';
export type { IConnectionDocument } from './Connection.model';

export { Message } from './Message.model';
export type { IMessageDocument, IAttachment, IReaction } from './Message.model';

export { Job } from './Job.model';
export type { IJobDocument, IRequiredSkill } from './Job.model';

export { Company } from './Company.model';
export type { ICompanyDocument } from './Company.model';

export { Event } from './Event.model';
export type { IEventDocument, AntiCheatEventType } from './Event.model';
