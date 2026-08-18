export default function GrowthChart({ data, keys = ['count'] }: { data: any[]; keys?: string[] }) {
  if (!data?.length) return <p className="py-8 text-center text-xs text-slate-400">No chart data.</p>;
  const max = Math.max(...data.flatMap(d => keys.map(k => d[k] || d.count || 0)), 1);
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-40">
        {data.slice(-30).map((d:any, idx:number)=>{
          const height = Math.max(4, ((d.count || d[keys[0]] || 0) / max) * 100);
          return <div key={idx} className="flex-1" title={`${d._id || d.date}: ${d.count || d[keys[0]]}`}>
            <div className="rounded-t bg-violet-500 hover:bg-violet-600 transition" style={{ height: `${height}%`, minHeight: '4px' }} />
          </div>;
        })}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>{data[0]?._id || ''}</span>
        <span>{data[data.length-1]?._id || ''}</span>
      </div>
    </div>
  );
}

export function GrowthDashboard({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {Object.entries(stats).slice(0,8).map(([k,v]:any)=>(
        <article key={k} className="rounded-card border bg-white p-4">
          <p className="text-lg font-extrabold">{typeof v === 'object' ? (v.total ?? v.count ?? JSON.stringify(v).slice(0,20)) : String(v)}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">{k.replaceAll('_',' ')}</p>
        </article>
      ))}
    </div>
  );
}
