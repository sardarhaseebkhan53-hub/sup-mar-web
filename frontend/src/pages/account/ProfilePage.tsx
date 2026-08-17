import { Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import AccountHeading from '../../components/account/AccountHeading';
import AvatarUpload from '../../components/account/AvatarUpload';
import ProfileForm, { profileValueFromUser } from '../../components/account/ProfileForm';
import VerificationBadge from '../../components/account/VerificationBadge';
import AuthAlert from '../../components/auth/AuthAlert';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { userApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const account = user!;
  const [form, setForm] = useState(() => profileValueFromUser(account));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useDocumentTitle('My profile');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null);
    try { const response = await userApi.update(form); updateLocalUser(response.data); setMessage({ type: 'success', text: 'Profile updated successfully.' }); }
    catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Profile update failed.' }); }
    finally { setSaving(false); }
  }
  return <><AccountHeading title="My profile" description="Manage the public identity and coarse location connected to your QAVLIO account." />{message && <div className="mb-5"><AuthAlert type={message.type} title={message.text} /></div>}<div className="grid items-start gap-5 xl:grid-cols-[1fr_310px]"><section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm sm:p-7"><AvatarUpload user={account} onUpdated={updateLocalUser} /><div className="my-6 h-px bg-slate-100" /><ProfileForm value={form} onChange={setForm} onSubmit={submit} saving={saving} /></section><aside className="space-y-4"><section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserRound size={18} className="text-violet-600" /><h2 className="text-sm font-extrabold">Public profile preview</h2></div><div className="mt-5 text-center"><Avatar name={account.name} src={account.avatar} size="lg" className="mx-auto" /><p className="mt-3 text-sm font-extrabold">{account.name}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">@{account.username} · {account.location?.city}</p><p className="mt-2 text-[10px] text-slate-500">Member since {account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }) : 'recently'}</p><div className="mt-4 flex flex-wrap justify-center gap-1.5"><VerificationBadge label="Email" status={account.verification.email?.status} /><VerificationBadge label="Phone" status={account.verification.phone?.status} /></div></div></section><section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><h2 className="text-sm font-extrabold">Account contact</h2><p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Mail size={14} />{account.email || 'No email added'}</p><p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Phone size={14} />{account.phone || 'No phone added'}</p><Button to="/account/verification" variant="secondary" size="sm" className="mt-4 w-full"><ShieldCheck size={14} /> Manage verification</Button></section><section className="rounded-2xl bg-ink-950 p-5 text-white"><p className="text-[10px] font-extrabold uppercase tracking-wider text-gold-300">Privacy by default</p><p className="mt-2 text-xs leading-5 text-white/60">QAVLIO shows your city—not your precise address. Sensitive account fields are never part of the public seller profile.</p></section></aside></div></>;
}
