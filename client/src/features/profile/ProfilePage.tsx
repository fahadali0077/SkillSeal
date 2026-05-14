// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage.tsx
// Main profile page. Reads :username (customUrl or userId) from the route,
// fetches the profile, and renders all sections.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <AlertCircle size={40} />
        <p className="font-medium">Profile not found.</p>
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
        <div className="space-y-4">

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

          {/* Connection count card */}
          <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="card p-4">
            <p className="text-sm text-gray-500">Connections</p>
            <p className="text-2xl font-bold text-gray-900">{profile.connectionCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {profile.followerCount} followers · {profile.followingCount} following
            </p>
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
