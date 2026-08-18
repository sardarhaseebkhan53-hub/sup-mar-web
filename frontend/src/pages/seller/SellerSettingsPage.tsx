import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, CreditCard, Lock, ShieldCheck, Store, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerErrorState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerApi } from '../../services/apiClient';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Hour = { day: string; open: boolean; from: string; to: string };

/** Settings (§41–43, §55) — Profile, Business, Notifications, Privacy, Team, Security, Billing. */
export default function SellerSettingsPage() {
  useDocumentTitle('Seller settings');
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['seller-profile'], queryFn: async () => (await sellerApi.profile()).data });
  const [tab, setTab] = useState<'profile' | 'business' | 'notifications' | 'privacy' | 'team' | 'security' | 'billing'>('profile');

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Configuration</p>
      <h1 className="mt-2 text-3xl font-extrabold">Settings</h1>
      <p className="mt-2 text-sm text-slate-500">Profile, business details, notifications, privacy, team, security, and billing in one place.</p>
    </header>

    <nav className="mt-6 flex gap-1 overflow-x-auto rounded-card border bg-white p-1.5" aria-label="Settings sections">
      {([['profile', 'Profile', UserRound], ['business', 'Business', Building2], ['notifications', 'Notifications', Bell], ['privacy', 'Privacy', ShieldCheck], ['team', 'Team', UsersRound], ['security', 'Security', Lock], ['billing', 'Billing', CreditCard]] as const).map(([id, label, Icon]) => (
        <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`flex shrink-0 items-center gap-1.5 rounded-control px-3.5 py-2 text-[11px] font-extrabold ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Icon size={13} aria-hidden="true" />{label}</button>
      ))}
    </nav>

    <div className="mt-6">
      {profile.isError && <SellerErrorState retry={() => void profile.refetch()} />}
      {tab === 'profile' && <section className="rounded-panel border bg-white p-5" aria-label="Profile settings">
        <h2 className="text-sm font-extrabold">Seller profile</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Your public seller identity, contact preferences, and ratings live on the <Link to="/seller/profile" className="text-violet-700 underline">profile page</Link>.</p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {[['Display name', profile.data?.displayName], ['Account type', profile.data?.accountType], ['Contact preference', profile.data?.contactPreference?.replace(/_/g, ' ')], ['Verification', profile.data?.verificationStatus?.replace('_', ' ')]].map(([label, value]) => (
            <div key={String(label)} className="rounded-card bg-slate-50 px-3 py-2.5"><dt className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-0.5 text-xs font-extrabold capitalize">{String(value || '—')}</dd></div>
          ))}
        </dl>
      </section>}

      {tab === 'business' && <BusinessSettings profile={profile.data} onSaved={() => client.invalidateQueries({ queryKey: ['seller-profile'] })} />}

      {tab === 'notifications' && <section className="rounded-panel border bg-white p-5" aria-label="Notification settings">
        <h2 className="text-sm font-extrabold">Notifications</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Seller events (inquiries, listing decisions, promotions, payments, reviews, low inventory) go to your notification center. Channel preferences live in <Link to="/account/notifications" className="text-violet-700 underline">account notifications</Link>.</p>
        <Link to="/seller/notifications" className="mt-4 inline-flex h-10 items-center gap-2 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white">Open notification center</Link>
      </section>}

      {tab === 'privacy' && <section className="rounded-panel border bg-white p-5" aria-label="Privacy settings">
        <h2 className="text-sm font-extrabold">Privacy</h2>
        <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-600">
          <li>· Your contact details stay hidden from buyers when “show contact details” is off in the Business tab.</li>
          <li>· Buyers you message see only your public display name and profile.</li>
          <li>· Customer data you see is limited to your own interactions — the platform-wide user database is never exposed.</li>
          <li>· Block abusive buyers from any conversation; blocked users cannot message you.</li>
        </ul>
        <Link to="/settings/blocked-users" className="mt-4 inline-flex h-10 items-center gap-2 rounded-control border px-4 text-xs font-extrabold">Manage blocked users</Link>
      </section>}

      {tab === 'team' && <section className="rounded-panel border bg-white p-5" aria-label="Team settings">
        <h2 className="text-sm font-extrabold">Team</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Invitations, roles, and the permission matrix.</p>
        <Link to="/seller/team" className="mt-4 inline-flex h-10 items-center gap-2 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white">Open team management</Link>
      </section>}

      {tab === 'security' && <section className="rounded-panel border bg-white p-5" aria-label="Security settings">
        <h2 className="text-sm font-extrabold">Security</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Sessions, password, and account security for your seller account.</p>
        <Link to="/account/security" className="mt-4 inline-flex h-10 items-center gap-2 rounded-control border px-4 text-xs font-extrabold">Open account security</Link>
      </section>}

      {tab === 'billing' && <section className="rounded-panel border bg-white p-5" aria-label="Billing settings">
        <h2 className="text-sm font-extrabold">Billing</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Invoices, transactions, packages, and credits. Payment credentials are never stored or shown.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/seller/transactions" className="inline-flex h-10 items-center gap-2 rounded-control border px-4 text-xs font-extrabold">Transactions</Link>
          <Link to="/seller/packages" className="inline-flex h-10 items-center gap-2 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white">Packages & credits</Link>
        </div>
      </section>}
    </div>
  </DashboardLayout>;
}

function BusinessSettings({ profile, onSaved }: { profile: any; onSaved: () => Promise<void> }) {
  const [business, setBusiness] = useState<any>(profile?.business || {});
  const [accountType, setAccountType] = useState(profile?.accountType || 'individual');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (profile) { setBusiness(profile.business || {}); setAccountType(profile.accountType || 'individual'); }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => sellerApi.updateProfile({
      accountType,
      business: {
        name: business.name || undefined,
        description: business.description || undefined,
        category: business.category || undefined,
        location: business.location || undefined,
        workingHours: accountType === 'business' ? DAYS.map((day) => {
          const existing = (business.workingHours || []).find((row: Hour) => row.day === day);
          return { day, open: existing?.open ?? (day !== 'sunday'), from: existing?.from || '', to: existing?.to || '' };
        }) : [],
        contact: { chat: business.contact?.chat !== false, call: Boolean(business.contact?.call), email: Boolean(business.contact?.email) },
        showContactDetails: business.showContactDetails !== false,
      },
    }),
    onSuccess: async () => { setSaved('Business settings saved.'); setError(''); await onSaved(); },
    onError: (cause) => { setSaved(''); setError(cause instanceof Error ? cause.message : 'Could not save business settings'); },
  });

  const hours: Hour[] = DAYS.map((day) => {
    const existing = (business.workingHours || []).find((row: Hour) => row.day === day);
    return { day, open: existing?.open ?? (day !== 'sunday'), from: existing?.from || '', to: existing?.to || '' };
  });
  const setHour = (day: string, patch: Partial<Hour>) => {
    const next = hours.map((row) => (row.day === day ? { ...row, ...patch } : row));
    setBusiness({ ...business, workingHours: next });
  };

  return <section className="rounded-panel border bg-white p-5" aria-label="Business settings">
    <h2 className="flex items-center gap-2 text-sm font-extrabold"><Store size={15} className="text-violet-600" aria-hidden="true" /> Business profile</h2>
    <p className="mt-1 text-xs font-semibold text-slate-500">Business name, description, category, location, working hours, and contact preferences.</p>

    <label className="mt-4 flex items-center justify-between rounded-card bg-slate-50 px-3 py-3 text-xs font-bold"><span>Account type — business sellers unlock inventory tracking and teams</span>
      <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="h-9 rounded-control border px-2 text-xs font-bold" aria-label="Account type"><option value="individual">Individual</option><option value="business">Business</option></select>
    </label>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Business name<input value={business.name || ''} onChange={(event) => setBusiness({ ...business, name: event.target.value })} maxLength={140} className="input-base mt-1 !h-10 text-xs" placeholder="Khan Motors" /></label>
      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Business category<input value={business.category || ''} onChange={(event) => setBusiness({ ...business, category: event.target.value })} maxLength={80} className="input-base mt-1 !h-10 text-xs" placeholder="Automotive" /></label>
      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 sm:col-span-2">Business description<textarea value={business.description || ''} onChange={(event) => setBusiness({ ...business, description: event.target.value })} rows={3} maxLength={2000} className="input-base mt-1 py-2 text-xs" placeholder="Family-run car dealership serving Lahore since 2015." /></label>
      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 sm:col-span-2">Business location<input value={business.location || ''} onChange={(event) => setBusiness({ ...business, location: event.target.value })} maxLength={160} className="input-base mt-1 !h-10 text-xs" placeholder="Lahore, DHA Phase 5" /></label>
    </div>

    <fieldset className="mt-5" disabled={accountType !== 'business'}>
      <legend className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Working hours {accountType !== 'business' && '(business accounts)'}</legend>
      <div className="mt-2 space-y-1.5">
        {hours.map((hour) => (
          <div key={hour.day} className="flex flex-wrap items-center gap-2 rounded-card bg-slate-50 px-3 py-2">
            <span className="w-20 text-[11px] font-extrabold capitalize">{hour.day}</span>
            <label className="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" checked={hour.open} onChange={(event) => setHour(hour.day, { open: event.target.checked })} className="h-4 w-4 accent-violet-600" />{hour.open ? 'Open' : 'Closed'}</label>
            {hour.open && <>
              <label className="sr-only" htmlFor={`from-${hour.day}`}>Opening time</label>
              <input id={`from-${hour.day}`} type="time" value={hour.from} onChange={(event) => setHour(hour.day, { from: event.target.value })} className="h-8 rounded-control border px-2 text-[10px] font-bold" aria-label={`${hour.day} opening time`} />
              <span className="text-[10px] text-slate-400">to</span>
              <label className="sr-only" htmlFor={`to-${hour.day}`}>Closing time</label>
              <input id={`to-${hour.day}`} type="time" value={hour.to} onChange={(event) => setHour(hour.day, { to: event.target.value })} className="h-8 rounded-control border px-2 text-[10px] font-bold" aria-label={`${hour.day} closing time`} />
            </>}
          </div>
        ))}
      </div>
    </fieldset>

    <fieldset className="mt-5">
      <legend className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Contact preferences</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {[['chat', 'Chat'], ['call', 'Calls'], ['email', 'Email']].map(([key, label]) => (
          <label key={key} className={`flex items-center gap-2 rounded-control px-3 py-2 text-[11px] font-bold ring-1 ${business.contact?.[key] ? 'bg-violet-50 text-violet-800 ring-violet-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
            <input type="checkbox" checked={Boolean(business.contact?.[key]) || (key === 'chat' && business.contact?.chat !== false)} onChange={(event) => setBusiness({ ...business, contact: { ...business.contact, [key]: event.target.checked } })} className="h-4 w-4 accent-violet-600" /> Allow {label.toLowerCase()}
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center justify-between rounded-card bg-slate-50 px-3 py-3 text-xs font-bold"><span>Show contact details on my public profile</span><input type="checkbox" checked={business.showContactDetails !== false} onChange={(event) => setBusiness({ ...business, showContactDetails: event.target.checked })} className="h-5 w-5 accent-violet-600" /></label>
    </fieldset>

    {saved && <p role="status" className="mt-4 rounded-card bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{saved}</p>}
    {error && <p role="alert" className="mt-4 rounded-card bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
    <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="mt-5 h-11 rounded-control bg-violet-600 px-6 text-xs font-extrabold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save business settings'}</button>
  </section>;
}
