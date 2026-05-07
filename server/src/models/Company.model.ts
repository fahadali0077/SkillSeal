import { Schema, model, Document, Types } from 'mongoose';

export interface ICompanyDocument extends Document {
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  tagline: string;
  website: string;
  industry: string;
  size: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5000+';
  founded: number;
  headquarters: string;
  description: string;
  specialties: string[];
  adminUsers: Types.ObjectId[];
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompanyDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    website: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'],
    },
    founded: { type: Number },
    headquarters: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    specialties: [{ type: String, trim: true }],
    adminUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followerCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

CompanySchema.index({ name: 'text' });

export const Company = model<ICompanyDocument>('Company', CompanySchema);
