import type { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
export const sanitizeInput = mongoSanitize({ replaceWith: '_' });
mongoose.plugin(function(schema: mongoose.Schema){
  const reject = function(this: Record<string, unknown>, next: (err?: Error) => void) {
    const filter = (this as {getQuery?:()=>Record<string,unknown>}).getQuery?.()??this;
    if(filter&&typeof filter==='object'&&'$where' in filter){next(new Error('$where not allowed'));return;}
    next();
  };
  ['find','findOne','countDocuments','findOneAndUpdate','deleteOne','deleteMany','updateOne','updateMany'].forEach(h=>schema.pre(h as 'find',reject));
});
function stripScripts(obj: unknown): unknown {
  if (typeof obj==='string') return obj.replace(/<script[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'').replace(/javascript:/gi,'').replace(/on\w+\s*=/gi,'');
  if (Array.isArray(obj)) return obj.map(stripScripts);
  if (obj&&typeof obj==='object') { const c: Record<string,unknown>={}; for (const[k,v] of Object.entries(obj as Record<string,unknown>)) c[k]=stripScripts(v); return c; }
  return obj;
}
export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  if(req.body) req.body=stripScripts(req.body) as Record<string,unknown>;
  if(req.query) req.query=stripScripts(req.query) as Record<string,string>;
  next();
}
