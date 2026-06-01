import multer from 'multer';
import type { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import logger from '../utils/logger';
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','application/pdf']);
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  ALLOWED.has(file.mimetype) ? cb(null,true) : cb(Object.assign(new Error('INVALID_FILE_TYPE'),{code:'INVALID_FILE_TYPE'}));
};
export const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits:{ fileSize:10*1024*1024, files:1 } });
export interface CloudinaryResult { url:string; publicId:string; format:string; bytes:number }
export async function uploadToCloudinary(buffer: Buffer, folder: string, publicId?: string): Promise<CloudinaryResult> {
  return new Promise((resolve,reject)=>{
    const stream = cloudinary.uploader.upload_stream({ folder, public_id:publicId, resource_type:'auto' },(err,result)=>{
      if(err||!result){reject(new Error('Upload failed'));return;}
      resolve({ url:result.secure_url, publicId:result.public_id, format:result.format, bytes:result.bytes });
    });
    const r = new Readable(); r.push(buffer); r.push(null); r.pipe(stream);
  });
}
export function isMulterError(err: unknown): err is multer.MulterError { return err instanceof multer.MulterError; }
export function isInvalidFileType(err: unknown): boolean { return err instanceof Error && (err as Error&{code?:string}).code==='INVALID_FILE_TYPE'; }
