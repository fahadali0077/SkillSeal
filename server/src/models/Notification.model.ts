import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'post_liked'
  | 'post_commented'
  | 'post_reposted'
  | 'new_message'
  | 'job_match'
  | 'certificate_issued'
  | 'certificate_expiring'
  | 'certificate_expired'
  | 'application_status';

export interface INotificationDocument extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  payload: Record<string, unknown>;
  isRead: boolean;
  batchKey: string;
  batchCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      // SCHEMA BUG 4: enum guards against typos that silently fall through
      // the NotificationItem.tsx switch statement showing "New notification".
      enum: [
        'connection_request', 'connection_accepted',
        'post_liked', 'post_commented', 'post_reposted',
        'new_message', 'job_match',
        'certificate_issued', 'certificate_expiring', 'certificate_expired',
        'application_status',
      ],
    },
    payload:     { type: Schema.Types.Mixed, default: {} },
    isRead:      { type: Boolean, default: false },
    batchKey:    { type: String, default: '' },
    batchCount:  { type: Number, default: 1 },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Notification = (mongoose.models['Notification'] ?? mongoose.model('Notification', NotificationSchema)) as any as mongoose.Model<INotificationDocument>;
