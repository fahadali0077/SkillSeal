import { rateLimit } from 'express-rate-limit';
import type { Request } from 'express';
import logger from '../utils/logger';
function ipKey(req: Request) { return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown'; }
function userKey(req: Request) { return (req as Request & {user?:{userId?:string}}).user?.userId ?? ipKey(req); }
function sessionKey(req: Request) { return ((req.body as Record<string,unknown>)?.['sessionId'] as string) ?? ipKey(req); }
function makeLimit(opts:{prefix:string;max:number;windowMs:number;keyFn:(r:Request)=>string;message:string}) {
  return rateLimit({ windowMs:opts.windowMs, max:opts.max, standardHeaders:'draft-7', legacyHeaders:false,
    keyGenerator:opts.keyFn,
    handler:(_req,res)=>res.status(429).json({success:false,message:opts.message}),
  });
}
export const apiLimiter     = makeLimit({prefix:'api',max:100,windowMs:60000,keyFn:userKey,message:'Too many requests.'});
export const authLimiter    = makeLimit({prefix:'auth',max:20,windowMs:60000,keyFn:ipKey,message:'Too many auth attempts.'});
export const verifyLimiter  = makeLimit({prefix:'verify',max:20,windowMs:60000,keyFn:ipKey,message:'Too many verify requests.'});
export const answerLimiter  = makeLimit({prefix:'answer',max:10,windowMs:60000,keyFn:sessionKey,message:'Answer rate limit reached.'});
export const registerLimiter= makeLimit({prefix:'register',max:5,windowMs:3600000,keyFn:ipKey,message:'Too many registrations.'});
