import { Schema, model, Document, Types } from 'mongoose';

export type AntiCheatEventType =
  | 'tab-switch'
  | 'window-blur'
  | 'paste-attempt'
  | 'window-focus'
  | 'right-click'
  | 'devtools-open'
  | 'copy-attempt'
  | 'screen-share';

export interface IEventDocument extends Document {
  sessionId: Types.ObjectId;
  eventType: AntiCheatEventType;
  timestamp: Date;
  questionId: Types.ObjectId | null;
  timeOnQuestion: number;
  strikeCount: number;
  tabHiddenDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEventDocument>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    eventType: {
      type: String,
      enum: [
        'tab-switch',
        'window-blur',
        'paste-attempt',
        'window-focus',
        'right-click',
        'devtools-open',
        'copy-attempt',
        'screen-share',
      ],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', default: null },
    timeOnQuestion: { type: Number, default: 0, min: 0 }, // ms elapsed on current question
    strikeCount: { type: Number, default: 0, min: 0 },    // running strike count at event time
    tabHiddenDuration: { type: Number, default: 0, min: 0 }, // ms tab was hidden
  },
  { timestamps: true }
);

// ── Index ─────────────────────────────────────────────────────

EventSchema.index({ sessionId: 1 });

export const Event = model<IEventDocument>('Event', EventSchema);
