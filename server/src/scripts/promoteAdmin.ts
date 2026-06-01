/**
 * promoteAdmin — bootstrap the first platform administrator.
 *
 * Roles can be assigned from the admin dashboard once at least one admin
 * exists, but the *first* admin has to be created out-of-band. Run this once
 * against an already-registered, email-verified account:
 *
 *   # locally
 *   npx ts-node src/scripts/promoteAdmin.ts you@example.com
 *
 *   # on Render (after build, dist exists)
 *   node dist/scripts/promoteAdmin.js you@example.com
 *
 * It is safe to re-run; promoting an already-admin user is a no-op.
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

async function main(): Promise<void> {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) {
    console.error('[promoteAdmin] Usage: promoteAdmin <email>   (or set ADMIN_EMAIL)');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[promoteAdmin] MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[promoteAdmin] Connected to MongoDB');

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`[promoteAdmin] No user found with email "${email}". Register & verify the account first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role === 'platform_admin') {
    console.log(`[promoteAdmin] ${email} is already a platform_admin — nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  user.role = 'platform_admin';
  user.status = 'active';
  // Invalidate existing tokens so the new role is picked up on next login.
  user.tokenVersion += 1;
  await user.save();

  console.log(`[promoteAdmin] ✅ ${email} is now a platform_admin.`);
  console.log('[promoteAdmin] They must log out and log back in for the new role to take effect.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[promoteAdmin] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
