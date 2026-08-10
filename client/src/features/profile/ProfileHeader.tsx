import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, MapPin, Link2, Edit2, Loader2, Briefcase, MessageSquare, Share2 } from 'lucide-react';
import type { IUserPublic, ConnectionStatus } from '@SkillSeal/shared';
import { useUploadPhoto } from './useProfile';
import ConnectionButton from '../connections/ConnectionButton';
import toast from 'react-hot-toast';

interface Props {
  profile: IUserPublic;
  isOwner: boolean;
  onEdit: () => void;
}

export default function ProfileHeader({ profile, isOwner, onEdit }: Props) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto(profile._id);
  const navigate    = useNavigate();

  // Lifted status so the Message button reacts to ConnectionButton changes
  // without waiting for a full profile cache refetch.
  const [liveStatus, setLiveStatus] = useState<ConnectionStatus>(profile.connectionStatus);
  useEffect(() => { setLiveStatus(profile.connectionStatus); }, [profile.connectionStatus]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size is 5 MB'); return; }
    await uploadPhoto.mutateAsync(file);
    toast.success('Photo updated!');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: profile.fullName, url }).catch(() => null);
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Banner — taller, gradient, with subtle pattern overlay */}
      <div className="h-40 sm:h-48 bg-paper-sunk relative overflow-hidden">
        {profile.bannerImage ? (
          <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <>
            {/* Decorative grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            {/* Animated glow */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden"
            />
            <motion.div
              animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-300/30 rounded-full blur-[80px]"
            />
          </>
        )}
        {/* Soft fade to white at bottom for smoother avatar overlap */}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-paper-sunk pointer-events-none" />
      </div>

      {/* Avatar + CTAs row */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-3">

          {/* Avatar */}
          <motion.div className="relative" whileHover={{ scale: isOwner ? 1.03 : 1 }}>
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-xl ring-1 ring-gray-100">
              {profile.profilePhoto
                ? <img src={profile.profilePhoto} alt={profile.fullName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 bg-paper-sunk">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </div>
              }
            </div>
            {isOwner && (
              <>
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploadPhoto.isPending}
                  className="absolute bottom-1 right-1 bg-white border border-gray-200 rounded-full p-2 shadow-md hover:bg-gray-50 transition-all"
                  aria-label="Upload photo"
                >
                  {uploadPhoto.isPending
                    ? <Loader2 size={14} className="animate-spin text-brand" />
                    : <Camera size={14} className="text-gray-600" />
                  }
                </button>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={handlePhotoChange} />
              </>
            )}
          </motion.div>

          {/* CTAs */}
          <div className="flex gap-2 pb-1 flex-wrap justify-end">
            {isOwner ? (
              <>
                <button onClick={onEdit} className="btn-secondary text-sm py-2 px-3">
                  <Edit2 size={14} /> Edit profile
                </button>
                <button onClick={handleShare} className="btn-secondary text-sm py-2 px-3">
                  <Share2 size={14} /> Share
                </button>
              </>
            ) : (
              <>
                <ConnectionButton
                  targetUserId={profile._id}
                  connectionStatus={profile.connectionStatus}
                  connectionId={profile.connectionId}
                  isFollowing={profile.isFollowing}
                  onStatusChange={setLiveStatus}
                />

                {liveStatus === 'accepted' && (
                  <button
                    onClick={() => navigate(`/messages?userId=${profile._id}`)}
                    className="btn-secondary text-sm py-2 px-3"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                )}

                <button onClick={handleShare} className="btn-secondary text-sm py-2 px-3">
                  <Share2 size={14} /> Share
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name & meta */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight">{profile.fullName}</h1>
            {profile.openToWork && (
              <span className="badge-success">
                Open to work
              </span>
            )}
            {profile.isHiring && (
              <span className="badge-info">
                <Briefcase size={10} /> Hiring
              </span>
            )}
          </div>

          {profile.headline && (
            <p className="text-gray-700 mt-1 text-sm sm:text-base">{profile.headline}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm text-gray-500">
            {(profile.location?.city || profile.location?.country) && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
              </span>
            )}
            {isOwner ? (
              <Link to="/network?tab=connections" className="text-brand hover:text-brand-dark font-semibold text-sm transition-colors">
                {profile.connectionCount ?? 0} connection{(profile.connectionCount ?? 0) !== 1 ? 's' : ''}
              </Link>
            ) : (
              <span className="text-gray-500 text-sm">
                {profile.connectionCount ?? 0} connection{(profile.connectionCount ?? 0) !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Links */}
          {profile.links?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.links.map((lk, i) => (
                <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:text-white font-medium bg-brand/5 hover:bg-brand border border-brand/15 hover:border-brand px-2.5 py-1 rounded-sm transition-all">
                  <Link2 size={11} /> {lk.label || lk.type}
                </a>
              ))}
            </div>
          )}

          {/* Summary */}
          {profile.summary && (
            <p className="mt-3.5 text-sm text-gray-600 leading-relaxed line-clamp-4">{profile.summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}
