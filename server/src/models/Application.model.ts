// ─────────────────────────────────────────────────────────────────────────────
// Application.model.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Schema, model, Document, Types } from 'mongoose';

export type AppStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'contacted'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface IApplicationDocument extends Document {
  jobId:       Types.ObjectId;
  candidateId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  companyId:   Types.ObjectId;
  status:      AppStatus;
  coverNote:   string;
  recruiterNote: string;
  appliedAt:   Date;
  viewedAt:    Date | null;
  createdAt:   Date;
  updatedAt:   Date;
}

const ApplicationSchema = new Schema<IApplicationDocument>(
  {
    jobId:          { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recruiterId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId:      { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    status:         {
      type: String,
      enum: ['applied','viewed','shortlisted','contacted','interviewing','offer','rejected','withdrawn'],
      default: 'applied',
    },
    coverNote:      { type: String, default: '', maxlength: 500 },
    recruiterNote:  { type: String, default: '' },
    appliedAt:      { type: Date, default: Date.now },
    viewedAt:       { type: Date, default: null },
  },
  { timestamps: true },
);

ApplicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
ApplicationSchema.index({ candidateId: 1, appliedAt: -1 });
ApplicationSchema.index({ jobId: 1, status: 1 });

export const Application = model<IApplicationDocument>('Application', ApplicationSchema);
