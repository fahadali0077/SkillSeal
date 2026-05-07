import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger';

cloudinary.config({ cloud_url: process.env.CLOUDINARY_URL });

export interface UploadResult {
  url:      string;
  publicId: string;
  width:    number;
  height:   number;
}

export async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: Record<string, any> = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    };
    if (publicId) { opts['public_id'] = publicId; opts['overwrite'] = true; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = cloudinary.uploader.upload_stream(opts as any, (err: any, result: any) => {
      if (err || !result) {
        logger.error('[cloudinary] Upload error:', err);
        return reject(err ?? new Error('Cloudinary upload failed'));
      }
      resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
    });
    stream.end(buffer);
  });
}
