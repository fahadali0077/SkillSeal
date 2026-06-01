/**
 * Seed script — runs automatically during `npm run build:prod`.
 * Safe to re-run: skips skills that already exist (upsert by slug).
 * After running, the build:prod command deletes dist/scripts so it
 * doesn't ship with the production bundle.
 */
import mongoose from 'mongoose';
import { Skill } from '../models/Skill.model';
import * as dotenv from 'dotenv';
dotenv.config();

// All 8 skills have concept libraries — all active.
const SKILLS = [
    { name: 'React',      slug: 'react',      category: 'frontend', icon: '⚛️',  description: 'Build UIs with React hooks, context, and modern patterns.',              availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true  },
  { name: 'Node.js',   slug: 'nodejs',     category: 'backend',  icon: '🟢',  description: 'Server-side JavaScript with Express, streams, and async patterns.',      availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true  },
  { name: 'MongoDB',   slug: 'mongodb',    category: 'database', icon: '🍃',  description: 'NoSQL document store with aggregation pipeline and indexing.',            availableTiers: ['beginner','intermediate','advanced'],         isActive: true  },
  // ── Full concept library now available ──────────────────────────────────
  { name: 'TypeScript', slug: 'typescript', category: 'frontend', icon: '🔷',  description: 'Typed JavaScript at scale — generics, utility types, and more.',         availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true },
  { name: 'Python',    slug: 'python',     category: 'backend',  icon: '🐍',  description: 'General-purpose scripting, data processing, and web backends.',           availableTiers: ['beginner','intermediate','advanced'],         isActive: true },
  { name: 'PostgreSQL',slug: 'postgresql', category: 'database', icon: '🐘',  description: 'Relational SQL, joins, CTEs, and query optimisation.',                     availableTiers: ['beginner','intermediate','advanced'],         isActive: true },
  { name: 'Docker',    slug: 'docker',     category: 'devops',   icon: '🐳',  description: 'Containerisation, multi-stage builds, and Compose.',                      availableTiers: ['beginner','intermediate','advanced'],         isActive: true },
  { name: 'GraphQL',   slug: 'graphql',    category: 'backend',  icon: '◈',   description: 'Schema design, resolvers, subscriptions, and DataLoader.',                 availableTiers: ['beginner','intermediate','advanced'],         isActive: true },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[seed] MONGODB_URI not set — skipping skill seed.');
    process.exit(0);
  }

  await mongoose.connect(uri);
  console.log('[seed] Connected to MongoDB');

  for (const skill of SKILLS) {
    await Skill.updateOne(
      { slug: skill.slug },
      // Use $set (not $setOnInsert) so isActive is corrected on every re-run.
      // This fixes skills that were already seeded as isActive: true.
      { $set: skill },
      { upsert: true }
    );
    console.log(`[seed] Upserted: ${skill.name}`);
  }

  await mongoose.disconnect();
  console.log('[seed] Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('[seed] Error:', err.message);
  // Exit 0 so a seed failure does NOT break the whole Render deploy
  process.exit(0);
});

