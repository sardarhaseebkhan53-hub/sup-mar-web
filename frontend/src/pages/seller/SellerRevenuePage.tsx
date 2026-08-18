import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download } from 'lucide-react';
import { useState } from 'react';
import RevenueCard, { PayoutStates } from '../../components/seller/RevenueCard';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

const WINDOWS = [{ id: '7days', label: '7 days' }, { id: '30days', label: '30 days' }, { id: '90days', label: '90 days' }, { id: 'year', label: '1 year' }];

/** Revenue (§33–34) — every metric labeled; payouts shown honestly as architecture-only. */
export default function SellerRevenuePage() {
  useDocumentTitle('Revenue');
  const [window, setWindow] = useState('30days');
  const [exporting, setExporting] = useState('');
  const query = useQuery({ queryKey: ['seller-revenue', window], queryFn: async () => (await sellerCenterApi.revenue(window)).data, staleTime: 60_000 });
  const data = query.data;

  const exportCsv = async (dataset: string) => {
    setExporting(dataset);
    try {
      const blob = await sellerCenterApi.exportCsv(dataset);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `qavlio-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Money</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><CreditCard className="text-violet-600" size={28} aria-hidden="true" /> Revenue</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Labeled, honest money metrics from your recorded QAVLIO payments.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Time window">
        {WINDOWS.map((item) => (
          <button key={item.id} type="button" onClick={() => setWindow(item.id)} aria-pressed={window === item.id} className={`h-10 rounded-control px-4 text-xs font-extrabold ${window === item.id ? 'bg-violet-600 text-white' : 'border bg-white text-slate-600'}`}>{item.label}</button>
        ))}
      </div>
    </header>

    <div className="mt-6">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && <>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Revenue metrics">{data.metrics.map((metric: any) => <RevenueCard key={metric.key} metric={metric} />)}</section>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <PayoutStates payouts={data.payouts} />
          <section className="rounded-panel border bg-white p-5" aria-label="Export your data">
            <h3 className="flex items-center gap-2 text-sm font-extrabold"><Download size={15} className="text-violet-600" aria-hidden="true" /> Exports</h3>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">CSV downloads of your business data. {data.basis}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['listings', 'leads', 'customers', 'analytics'].map((dataset) => (
                <button key={dataset} type="button" onClick={() => void exportCsv(dataset)} disabled={exporting === dataset} className="h-10 rounded-control border bg-white px-4 text-xs font-extrabold capitalize disabled:opacity-50">
                  {exporting === dataset ? 'Preparing…' : `Export ${dataset}`}
                </button>
              ))}
            </div>
          </section>
        </div>
      </>}
    </div>
  </DashboardLayout>;
}
