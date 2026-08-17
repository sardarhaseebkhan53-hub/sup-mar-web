import { Bell, CheckCircle2, Mail, Megaphone, MessageSquareText, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import AccountHeading from '../../components/account/AccountHeading';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { userApi } from '../../services/apiClient';
import type { NotificationPreferences } from '../../types/auth';

const defaults: NotificationPreferences = { inApp: true, email: true, push: false, sms: true, security: true, marketing: false, messages: true, listingUpdates: true, account: true, promotions: false, announcements: true };
export default function NotificationPreferencesPage() {
  const { user, refreshProfile } = useAuth(); const [preferences, setPreferences] = useState<NotificationPreferences>({ ...defaults, ...user?.preferences?.notifications }); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); useDocumentTitle('Notifications');
  const topics: Array<{ key: keyof NotificationPreferences; icon: typeof Bell; label: string; body: string; locked?: boolean }> = [
    { key: 'messages', icon: MessageSquareText, label: 'Messages', body: 'New conversation and reply alerts.' }, { key: 'listingUpdates', icon: Bell, label: 'Listing updates', body: 'Approval, rejection, sale, and expiry updates.' },
    { key: 'account', icon: CheckCircle2, label: 'Account notifications', body: 'Verification, profile, and support activity.' }, { key: 'promotions', icon: Sparkles, label: 'Promotions', body: 'Optional seller promotion and campaign updates.' },
    { key: 'announcements', icon: Megaphone, label: 'Platform announcements', body: 'Important product and policy information.' }, { key: 'email', icon: Mail, label: 'Email delivery', body: 'Receive enabled topics by email where supported.' },
    { key: 'security', icon: ShieldAlert, label: 'Security alerts', body: 'Passwords, sessions, and high-risk account changes.', locked: true },
  ];
  async function save() { setSaving(true); setMessage(null); try { await userApi.updateNotifications(preferences); await refreshProfile(); setMessage({ type: 'success', text: 'Notification preferences updated' }); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Notification preferences could not be saved.' }); } finally { setSaving(false); } }
  return <><AccountHeading title="Notifications" description="Choose which useful QAVLIO updates you receive. Unnecessary notifications remain off by default." />{message && <div className="mb-5"><AuthAlert type={message.type} title={message.text} /></div>}<section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm sm:p-7"><div className="space-y-3">{topics.map(({ key, icon: Icon, label, body, locked }) => <label key={key} className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-xs">{label}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{body}</span></span><input type="checkbox" checked={preferences[key]} disabled={locked} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} className="h-5 w-5 accent-violet-600 disabled:opacity-60" /></label>)}</div><div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-800"><ShieldAlert size={19} className="shrink-0" /><p className="text-[10px] leading-5"><strong>Security alerts stay on.</strong> Critical account-protection messages cannot be disabled.</p></div><div className="mt-6 flex justify-end"><Button onClick={save} loading={saving}>Save preferences</Button></div></section></>;
}
