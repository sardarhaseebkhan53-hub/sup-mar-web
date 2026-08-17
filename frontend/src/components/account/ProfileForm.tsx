import { MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import type { AuthUser } from '../../types/auth';
import { Button } from '../ui/Button';

export interface ProfileFormValue {
  name: string; username: string; about: string; language: 'en' | 'ur';
  location: { country: string; province: string; city: string; area: string };
}
interface ProfileFormProps { value: ProfileFormValue; onChange: (value: ProfileFormValue) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; }

export const profileValueFromUser = (user: AuthUser): ProfileFormValue => ({
  name: user.name || '', username: user.username || '', about: user.about || '', language: user.preferences?.language || 'en',
  location: { country: user.location?.country || 'PK', province: user.location?.province || '', city: user.location?.city || '', area: user.location?.area || '' },
});

export default function ProfileForm({ value, onChange, onSubmit, saving }: ProfileFormProps) {
  const field = (key: keyof Omit<ProfileFormValue, 'location'>, next: string) => onChange({ ...value, [key]: next });
  const location = (key: keyof ProfileFormValue['location'], next: string) => onChange({ ...value, location: { ...value.location, [key]: next } });
  return <form onSubmit={onSubmit}><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-extrabold" htmlFor="profile-name">Full name<input id="profile-name" className="input-base mt-2" value={value.name} onChange={(event) => field('name', event.target.value)} required /></label><label className="text-xs font-extrabold" htmlFor="profile-username">Username<input id="profile-username" className="input-base mt-2" value={value.username} onChange={(event) => field('username', event.target.value)} pattern="[a-z0-9._]{3,40}" required /></label><label className="text-xs font-extrabold sm:col-span-2" htmlFor="profile-about">About you<textarea id="profile-about" className="input-base mt-2 min-h-28 py-3" maxLength={1000} value={value.about} onChange={(event) => field('about', event.target.value)} placeholder="Tell buyers and sellers a little about you." /></label></div><h2 className="mt-7 flex items-center gap-2 text-sm font-extrabold"><MapPin size={17} className="text-violet-600" />Location</h2><p className="mt-1 text-[10px] text-slate-500">Only your city and optional area are used publicly—not a precise home address.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-extrabold">Province<input className="input-base mt-2" value={value.location.province} onChange={(event) => location('province', event.target.value)} /></label><label className="text-xs font-extrabold">City<input className="input-base mt-2" value={value.location.city} onChange={(event) => location('city', event.target.value)} required /></label><label className="text-xs font-extrabold">Area / locality<input className="input-base mt-2" value={value.location.area} onChange={(event) => location('area', event.target.value)} /></label><label className="text-xs font-extrabold">Language<select className="input-base mt-2" value={value.language} onChange={(event) => field('language', event.target.value)}><option value="en">English</option><option value="ur">اردو</option></select></label></div><div className="mt-7 flex justify-end border-t border-slate-100 pt-5"><Button type="submit" loading={saving}>Save profile</Button></div></form>;
}
