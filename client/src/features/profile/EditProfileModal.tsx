import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import type { IUserPublic, ILink } from '@SkillSeal/shared';
import { useUpdateProfile } from './useProfile';
import { API_ORIGIN } from '../../lib/apiBase';
import { useAuthStore } from '../auth/useAuth';

const profileSchema = z.object({
  headline: z.string().max(220).optional(),
  summary: z.string().max(2600).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  openToWork: z.boolean().default(false),
  isHiring: z.boolean().default(false),
  customUrl: z.string().regex(/^[a-z0-9-]*$/, 'Only lowercase letters, numbers, hyphens').max(60).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const LINK_TYPES = ['github', 'linkedin', 'portfolio', 'twitter', 'other'] as const;

interface Props { profile: IUserPublic; onClose: () => void; }

// HIGH-13 / BROKEN-04: shared media upload helper that calls one of the
// /api/v1/users/me upload aliases with multipart/form-data.
async function uploadMedia(file: File, endpoint: 'upload-photo' | 'upload-banner'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // AUDIT §1.3: read the in-memory token from the store, not localStorage.
  const token = useAuthStore.getState().accessToken ?? '';
  const res = await fetch(`${API_ORIGIN}/api/v1/users/me/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const json = await res.json();
  return json?.data?.photoUrl ?? json?.data?.bannerUrl ?? '';
}

export default function EditProfileModal({ profile, onClose }: Props) {
  const updateProfile = useUpdateProfile(profile._id);
  const [links, setLinks] = useState<ILink[]>(profile.links ?? []);
  const [photoUrl, setPhotoUrl] = useState<string>(profile.profilePhoto ?? '');
  const [bannerUrl, setBannerUrl] = useState<string>(profile.bannerImage ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      headline: profile.headline,
      summary: profile.summary,
      city: profile.location?.city,
      country: profile.location?.country,
      openToWork: profile.openToWork,
      isHiring: profile.isHiring,
      customUrl: profile.customUrl,
    },
  });

  const addLink = () => setLinks((l) => [...l, { label: '', url: '', type: 'other' }]);
  const removeLink = (i: number) => setLinks((l) => l.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof ILink, value: string) => {
    setLinks((l) => l.map((lk, idx) => idx === i ? { ...lk, [field]: value } : lk));
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return; }
    setUploadError(null); setUploadingPhoto(true);
    try { setPhotoUrl(await uploadMedia(file, 'upload-photo')); }
    catch (err) { setUploadError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  const handleBannerPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return; }
    setUploadError(null); setUploadingBanner(true);
    try { setBannerUrl(await uploadMedia(file, 'upload-banner')); }
    catch (err) { setUploadError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploadingBanner(false); if (bannerInputRef.current) bannerInputRef.current.value = ''; }
  };

  const onSubmit = async (data: ProfileForm) => {
    await updateProfile.mutateAsync({
      headline: data.headline,
      summary: data.summary,
      location: { city: data.city ?? '', country: data.country ?? '' },
      openToWork: data.openToWork,
      isHiring: data.isHiring,
      customUrl: data.customUrl,
      links,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-8 mb-8"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Edit profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="px-6 py-5 space-y-5">
            {/* HIGH-13 + BROKEN-04: photo + banner uploads */}
            <div className="space-y-3">
              {/* Banner preview */}
              <div className="relative h-24 w-full rounded-lg bg-paper-sunk overflow-hidden">
                {bannerUrl && <img src={bannerUrl} alt="banner" className="absolute inset-0 w-full h-full object-cover" />}
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-xs font-medium rounded-md px-2 py-1 flex items-center gap-1.5 shadow"
                >
                  {uploadingBanner ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingBanner ? 'Uploading…' : 'Change banner'}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleBannerPick}
                />
              </div>
              {/* Avatar overlap */}
              <div className="flex items-center gap-3 -mt-10 ml-2">
                <div className="relative">
                  {photoUrl
                    ? <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-1 ring-white" />
                    : <div className="w-16 h-16 rounded-full bg-brand/10 ring-1 ring-white flex items-center justify-center font-bold text-brand">{profile.firstName?.[0]}</div>}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 bg-brand text-white rounded-full p-1.5 shadow"
                    title="Change photo"
                  >
                    {uploadingPhoto ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoPick}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-10">PNG, JPG, WebP. Max 5 MB.</p>
              </div>
              {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            </div>

            {/* Headline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input className={`input ${errors.headline ? 'border-red-400' : ''}`}
                placeholder="e.g. Senior React Developer · Open to remote" {...register('headline')} />
              {errors.headline && <p className="text-xs text-red-500 mt-0.5">{errors.headline.message}</p>}
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea rows={4} className="input resize-none"
                placeholder="Tell your professional story…" {...register('summary')} />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input className="input" placeholder="London" {...register('city')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input className="input" placeholder="United Kingdom" {...register('country')} />
              </div>
            </div>

            {/* Custom URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom URL</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400 whitespace-nowrap">SkillSeal.dev/</span>
                <input className={`input flex-1 ${errors.customUrl ? 'border-red-400' : ''}`}
                  placeholder="firstname-lastname" {...register('customUrl')} />
              </div>
              {errors.customUrl && <p className="text-xs text-red-500 mt-0.5">{errors.customUrl.message}</p>}
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" {...register('openToWork')} />
                Open to work
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" {...register('isHiring')} />
                Hiring
              </label>
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Links</label>
                <button type="button" onClick={addLink} className="text-xs text-brand hover:text-brand-dark flex items-center gap-1">
                  <Plus size={12} /> Add link
                </button>
              </div>
              <div className="space-y-2">
                {links.map((lk, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select className="input w-28 text-sm" value={lk.type}
                      onChange={(e) => updateLink(i, 'type', e.target.value)}>
                      {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="input flex-1 text-sm" placeholder="Label" value={lk.label}
                      onChange={(e) => updateLink(i, 'label', e.target.value)} />
                    <input className="input flex-1 text-sm" placeholder="https://…" value={lk.url}
                      onChange={(e) => updateLink(i, 'url', e.target.value)} />
                    <button type="button" onClick={() => removeLink(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end pt-2 border-t">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={updateProfile.isPending} className="btn-primary flex items-center gap-2">
                {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
