// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage.tsx
// Main profile page. Reads :username (customUrl or userId) from the route,
// fetches the profile, and renders all sections.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Users } from 'lucide-react';

import { useSEO } from '../../lib/useSEO';
import { useProfile }          from './useProfile';
import { useAuthStore }        from '../auth/useAuth';
import ProfileHeader           from './ProfileHeader';
import SkillsSection           from './SkillsSection';
import ExperienceSection       from './ExperienceSection';
import EducationSection        from './EducationSection';
import CertificationsSection   from './CertificationsSection';
import ProfileCompletenessBar  from './ProfileCompletenessBar';
import EditProfileModal        from './EditProfileModal';
import PeopleYouMayKnow        from '../connections/PeopleYouMayKnow';
import UserPostsSection        from './UserPostsSection';

const fadeIn = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0  },
  transition: { duration: 0.35, ease: 'easeOut' },
};

export default function ProfilePage() {
  // ── ALL hooks must be called unconditionally and in the same order on
  // every render. useSEO is first because the old build had it AFTER the
  // early returns, so React's fiber had 4 hook slots; the fix adds slot 5.
  // Putting it first guarantees a stable order regardless of loading state.
  // profile is undefined on first render — optional chaining handles that.
  const { username }  = useParams<{ username: string }>();

  // Slot 1 — must stay before any early return
  const currentUser   = useAuthStore((s) => s.user);
  // Slot 2
  const [editOpen, setEditOpen] = useState(false);
  // Slot 3 — data fetch
  const { data: profile, isLoading, isError } = useProfile(username ?? '');
  // Slot 4 — SEO (useEffect internally). Must be here, not after early returns.
  useSEO({
    title:       profile?.fullName ?? 'Profile',
    description: profile
      ? (profile.headline || `${profile.fullName}'s profile on SkillSeal.`)
      : 'View this professional profile on SkillSeal.',
    canonical:   profile
      ? `/profile/${profile.customUrl || profile._id}`
      : '/profile',
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 size={36} className="animate-spin text-brand" />
        <p className="text-sm">Loading profile…</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <p className="font-semibold text-gray-700">Profile not found</p>
        <p className="text-sm text-gray-400">The profile you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const isOwner = currentUser?._id === profile._id;

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left / Main column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Profile header */}
          <motion.div {...fadeIn} transition={{ delay: 0 }}>
            <ProfileHeader
              profile={profile}
              isOwner={isOwner}
              onEdit={() => setEditOpen(true)}
            />
          </motion.div>

          {/* Verified certifications (shown to all) */}
          {profile.skills.some((s) => s.status === 'verified') && (
            <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
              <CertificationsSection profile={profile} />
            </motion.div>
          )}

          {/* Skills */}
          <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
            <SkillsSection profile={profile} isOwner={isOwner} />
          </motion.div>

          {/* Experience */}
          <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
            <ExperienceSection profile={profile} isOwner={isOwner} />
          </motion.div>

          {/* Education */}
          <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
            <EducationSection profile={profile} isOwner={isOwner} />
          </motion.div>

          {/* Posts */}
          <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
            <UserPostsSection userId={profile._id} isOwner={isOwner} />
          </motion.div>
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

          {/* Profile completeness — owner only */}
          {isOwner && (
            <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
              <ProfileCompletenessBar userId={profile._id} />
            </motion.div>
          )}

          {/* People you may know — owner only */}
          {isOwner && (
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <PeopleYouMayKnow />
            </motion.div>
          )}

          {/* Connection / network stats */}
          <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <Users size={15} className="text-brand" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Network</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-1">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{profile.connectionCount ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Connections</p>
              </div>
              <div className="py-1 border-l border-gray-100">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{profile.followerCount ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Followers</p>
              </div>
              <div className="py-1 border-l border-gray-100">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{profile.followingCount ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Following</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditProfileModal profile={profile} onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}
