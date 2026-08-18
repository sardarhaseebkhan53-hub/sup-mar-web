import { useQuery } from '@tanstack/react-query';
import { Info, UsersRound } from 'lucide-react';
import TeamTable from '../../components/seller/TeamTable';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/** Team management (§51–54) — business accounts only; permission matrix is displayed openly. */
export default function SellerTeamPage() {
  useDocumentTitle('Team');
  const query = useQuery({ queryKey: ['seller-team'], queryFn: async () => (await sellerCenterApi.team()).data, staleTime: 30_000 });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Business</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><UsersRound className="text-violet-600" size={28} aria-hidden="true" /> Team</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Invite managers and staff. They sign in with their own QAVLIO account — you never create passwords, and financial access stays with the owner.</p>
    </header>

    {data && !data.eligible && <div role="status" className="mt-6 rounded-panel border border-amber-200 bg-amber-50 p-5">
      <p className="flex items-center gap-2 text-sm font-extrabold text-amber-900"><Info size={15} aria-hidden="true" /> Team management is a business-account feature</p>
      <p className="mt-2 text-xs font-semibold text-amber-800">Switch your account to a business profile in <a href="/seller/settings" className="underline">Settings → Business</a> to invite a team.</p>
    </div>}

    {data && data.roleMatrix && <section className="mt-6 rounded-panel border bg-white p-5" aria-label="Permission matrix">
      <h2 className="text-sm font-extrabold">Who can do what</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {data.roleMatrix.filter((row: any) => row.role !== 'owner').map((row: any) => (
          <div key={row.role} className="rounded-card bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 capitalize">{row.role}</p>
            <p className="mt-1.5 text-[10px] font-semibold leading-4 text-slate-600">{row.permissions.join(' · ')}</p>
          </div>
        ))}
        <div className="rounded-card bg-violet-50 p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Owner (you)</p>
          <p className="mt-1.5 text-[10px] font-semibold leading-4 text-violet-900">Everything, including revenue, orders, packages, and team.</p>
        </div>
      </div>
    </section>}

    <div className="mt-6">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && <TeamTable members={data.members} canManage={data.eligible} />}
    </div>
  </DashboardLayout>;
}
