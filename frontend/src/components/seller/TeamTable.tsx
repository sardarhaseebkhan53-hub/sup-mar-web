import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, ShieldCheck, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { sellerCenterApi } from '../../services/apiClient';

export type TeamMember = {
  id: string;
  role: string;
  status: string;
  inviteEmail: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  userId: string | null;
  permissions?: string[];
};

/** TeamTable (§51–54, §69) — invitations and memberships with the QAVLIO permission matrix. */
export default function TeamTable({ members, canManage }: { members: TeamMember[]; canManage: boolean }) {
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [inviteResult, setInviteResult] = useState<{ token: string | null; note: string } | null>(null);
  const [error, setError] = useState('');

  const invite = useMutation({
    mutationFn: () => sellerCenterApi.inviteMember({ email: email.trim(), role }),
    onSuccess: (response) => {
      setEmail('');
      setInviteResult({ token: response.data.invite.token, note: response.data.invite.note });
      void client.invalidateQueries({ queryKey: ['seller-team'] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Invitation failed'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => sellerCenterApi.updateMember(id, data),
    onSuccess: () => client.invalidateQueries({ queryKey: ['seller-team'] }),
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Update failed'),
  });

  const statusTone: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', invited: 'bg-amber-50 text-amber-800 ring-amber-200', revoked: 'bg-rose-50 text-rose-700 ring-rose-200', expired: 'bg-slate-50 text-slate-500 ring-slate-200' };

  return <section aria-label="Team members">
    <div className="overflow-x-auto rounded-card border bg-white">
      <table className="w-full min-w-[640px] text-start">
        <caption className="sr-only">Business team members and invitations</caption>
        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          <tr>{['Member', 'Role', 'Status', 'Invited', 'Expires', canManage ? 'Actions' : 'Access'].map((head) => <th key={head} scope="col" className="px-4 py-3">{head}</th>)}</tr>
        </thead>
        <tbody>
          {members.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs font-semibold text-slate-400">No invitations or members yet.</td></tr>}
          {members.map((member) => <tr key={member.id} className="border-t">
            <th scope="row" className="px-4 py-3 text-xs font-extrabold"><span className="flex items-center gap-2"><Mail size={12} className="text-slate-400" aria-hidden="true" />{member.inviteEmail}</span></th>
            <td className="px-4 py-3 text-xs font-bold capitalize">{member.role}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ring-1 ${statusTone[member.status] || statusTone.expired}`}>{member.status}</span></td>
            <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(member.invitedAt).toLocaleDateString()}</td>
            <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(member.expiresAt).toLocaleDateString()}</td>
            <td className="px-4 py-3">
              {canManage && member.role !== 'owner' ? (
                <div className="flex flex-wrap gap-1">
                  {member.status === 'invited' && <button type="button" onClick={() => update.mutate({ id: member.id, data: { status: 'active' } })} className="h-8 rounded-control border px-2.5 text-[10px] font-extrabold">Activate</button>}
                  {member.status === 'active' && <button type="button" onClick={() => update.mutate({ id: member.id, data: { role: member.role === 'staff' ? 'manager' : 'staff' } })} className="h-8 rounded-control border px-2.5 text-[10px] font-extrabold">Make {member.role === 'staff' ? 'manager' : 'staff'}</button>}
                  {['invited', 'active'].includes(member.status) && <button type="button" onClick={() => update.mutate({ id: member.id, data: { status: 'revoked' } })} className="h-8 rounded-control border border-rose-200 px-2.5 text-[10px] font-extrabold text-rose-600">Revoke</button>}
                </div>
              ) : <span className="text-[9px] font-semibold text-slate-400">{member.permissions ? member.permissions.join(' · ') : '—'}</span>}
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {canManage && <form className="mt-5 rounded-card border bg-white p-4" onSubmit={(event) => { event.preventDefault(); setError(''); setInviteResult(null); invite.mutate(); }} aria-label="Invite a team member">
      <p className="flex items-center gap-2 text-xs font-extrabold"><UserRoundCog size={15} className="text-violet-600" aria-hidden="true" /> Invite a team member</p>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">They sign in with their existing QAVLIO account — you never create passwords for them.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="team-invite-email">Email address</label>
        <input id="team-invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" className="input-base !h-10 min-w-0 flex-1 text-xs" maxLength={160} />
        <label className="sr-only" htmlFor="team-invite-role">Role</label>
        <select id="team-invite-role" value={role} onChange={(event) => setRole(event.target.value as 'manager' | 'staff')} className="h-10 rounded-control border px-3 text-xs font-bold">
          <option value="staff">Staff — listings, messages, leads</option>
          <option value="manager">Manager — + customers, analytics, AI</option>
        </select>
        <button type="submit" disabled={invite.isPending || !email.trim()} className="h-10 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{invite.isPending ? 'Inviting…' : 'Send invitation'}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] font-bold text-rose-600">{error}</p>}
      {inviteResult && <div role="status" className="mt-3 rounded-card bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-900">
        <p className="flex items-center gap-1 font-extrabold"><ShieldCheck size={13} aria-hidden="true" /> Invitation created</p>
        <p className="mt-1">{inviteResult.note}</p>
        {inviteResult.token && <p className="mt-2 break-all rounded-control bg-white p-2 font-mono text-[10px]">Join token: {inviteResult.token}</p>}
      </div>}
    </form>}
  </section>;
}
