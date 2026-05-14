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
    <div className="card overflow-hidden mb-4">
      {/* Banner */}
      <div className="h-32 bg-gradient-to-r from-brand to-brand-light relative">
        {profile.bannerImage && (
          <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Avatar + CTAs row */}
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between -mt-12 mb-3">

          {/* Avatar */}
          <motion.div className="relative" whileHover={{ scale: isOwner ? 1.03 : 1 }}>
            <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow">
              {profile.profilePhoto
                ? <img src={profile.profilePhoto} alt={profile.fullName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </div>
              }
            </div>
            {isOwner && (
              <>
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploadPhoto.isPending}
                  className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-gray-50 transition-colors"
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
                <button onClick={onEdit} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Edit2 size={14} /> Edit profile
                </button>
                <button onClick={handleShare} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Share2 size={14} /> Share
                </button>
              </>
            ) : (
              <>
                {/* Full connection button — handles Connect/Pending/Connected+dropdown/Remove */}
                <ConnectionButton
                  targetUserId={profile._id}
                  connectionStatus={profile.connectionStatus}
                  connectionId={profile.connectionId}
                  isFollowing={profile.isFollowing}
                  onStatusChange={setLiveStatus}
                />

                {/* Message — only visible when connected */}
                {liveStatus === 'accepted' && (
                  <button
                    onClick={() => navigate(`/messages?userId=${profile._id}`)}
                    className="btn-secondary flex items-center gap-1.5 text-sm"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                )}

                {/* Share profile */}
                <button onClick={handleShare} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Share2 size={14} /> Share
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name & meta */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{profile.fullName}</h1>
            {profile.openToWork && (
              <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                Open to work
              </span>
            )}
            {profile.isHiring && (
              <span className="text-xs font-medium bg-blue-50 text-brand border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Briefcase size={10} /> Hiring
              </span>
            )}
          </div>

          {profile.headline && (
            <p className="text-gray-700 mt-0.5">{profile.headline}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {(profile.location?.city || profile.location?.country) && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
              </span>
            )}
            <Link to="/network" className="text-brand hover:text-brand-dark font-medium text-sm">
              {profile.connectionCount ?? 0} connection{(profile.connectionCount ?? 0) !== 1 ? 's' : ''}
            </Link>
          </div>

          {/* Links */}
          {profile.links?.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {profile.links.map((lk, i) => (
                <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium">
                  <Link2 size={12} /> {lk.label || lk.type}
                </a>
              ))}
            </div>
          )}

          {/* Summary */}
          {profile.summary && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-3">{profile.summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}
