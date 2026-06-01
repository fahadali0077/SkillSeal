import { Schema, model, Document } from 'mongoose';

export interface ISkillDocument extends Document {
  name: string;
  slug: string;
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'ai' | 'design' | 'other';
  availableTiers: string[];
  description: string;
  icon: string;
  isActive: boolean;
  totalVerified: number;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema<ISkillDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      enum: ['frontend', 'backend', 'database', 'devops', 'ai', 'design', 'other'],
      required: true,
    },
    availableTiers: {
      type: [String],
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: ['beginner', 'intermediate', 'advanced'],
    },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    totalVerified: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

SkillSchema.index({ name: 'text' }); // text search on name only (slug unique index comes from field def)
SkillSchema.index({ category: 1, isActive: 1 });

export const Skill = model<ISkillDocument>('Skill', SkillSchema);
