/**
 * Seed script — run once to populate the Skills collection.
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/seedSkills.ts
 */
import mongoose from 'mongoose';
import { Skill } from '../models/skill.model';
import * as dotenv from 'dotenv';
dotenv.config();

const SKILLS = [
  { name: 'React', slug: 'react', category: 'frontend', icon: '⚛️', description: 'Build UIs with React hooks, context, and modern patterns.', availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true },
  { name: 'Node.js', slug: 'nodejs', category: 'backend', icon: '🟢', description: 'Server-side JavaScript with Express, streams, and async patterns.', availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true },
  { name: 'MongoDB', slug: 'mongodb', category: 'database', icon: '🍃', description: 'NoSQL document store with aggregation pipeline and indexing.', availableTiers: ['beginner','intermediate','advanced'], isActive: true },
  { name: 'TypeScript', slug: 'typescript', category: 'frontend', icon: '🔷', description: 'Typed JavaScript at scale — generics, utility types, and more.', availableTiers: ['beginner','intermediate','advanced','expert'], isActive: true },
  { name: 'Python', slug: 'python', category: 'backend', icon: '🐍', description: 'General-purpose scripting, data processing, and web backends.', availableTiers: ['beginner','intermediate','advanced'], isActive: true },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'database', icon: '🐘', description: 'Relational SQL, joins, CTEs, and query optimisation.', availableTiers: ['beginner','intermediate','advanced'], isActive: true },
  { name: 'Docker', slug: 'docker', category: 'devops', icon: '🐳', description: 'Containerisation, multi-stage builds, and Compose.', availableTiers: ['beginner','intermediate','advanced'], isActive: true },
  { name: 'GraphQL', slug: 'graphql', category: 'backend', icon: '◈', description: 'Schema design, resolvers, subscriptions, and DataLoader.', availableTiers: ['beginner','intermediate','advanced'], isActive: true },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env var is not set');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const skill of SKILLS) {
    const existing = await Skill.findOne({ slug: skill.slug });
    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${skill.name}`);
    } else {
      await Skill.create(skill);
      console.log(`  ✅ Created: ${skill.name}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone. Skills are seeded.');
}

main().catch(err => { console.error(err); process.exit(1); });
