import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, MessagesSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SellerEmptyState, SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/** Quick replies (§25–26) — manual templates with spam guards; nothing auto-sends. */
export default function SellerMessageTemplatesPage() {
  useDocumentTitle('Quick replies');
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['seller-templates'], queryFn: async () => (await sellerCenterApi.templates()).data });

  const create = useMutation({
    mutationFn: () => sellerCenterApi.createTemplate({ name: name.trim(), body: body.trim() }),
    onSuccess: async () => { setName(''); setBody(''); setError(''); await client.invalidateQueries({ queryKey: ['seller-templates'] }); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not save template'),
  });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: unknown }) => sellerCenterApi.updateTemplate(id, data), onSuccess: () => client.invalidateQueries({ queryKey: ['seller-templates'] }) });
  const remove = useMutation({ mutationFn: (id: string) => sellerCenterApi.deleteTemplate(id), onSuccess: () => client.invalidateQueries({ queryKey: ['seller-templates'] }) });

  const starters = ['Yes, this item is available.', 'Pickup is available.', 'Please share your preferred time.'];

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Conversations</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><MessagesSquare className="text-violet-600" size={28} aria-hidden="true" /> Quick replies</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Predefined replies you insert manually when messaging buyers. Automated sending and spam are not allowed.</p>
    </header>

    <section className="mt-6 rounded-panel border bg-white p-5" aria-label="Create a quick reply">
      <form className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="input-base mt-1 !h-10 text-xs" placeholder="Availability" /></label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Reply text<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={2} maxLength={500} rows={2} className="input-base mt-1 py-2 text-xs" placeholder="Yes, this item is available." /></label>
        <button type="submit" disabled={create.isPending || !name.trim() || !body.trim()} className="h-10 self-end rounded-control bg-violet-600 px-5 text-xs font-extrabold text-white disabled:opacity-50"><MessageSquarePlus size={14} className="mr-1 inline" aria-hidden="true" />{create.isPending ? 'Saving…' : 'Save reply'}</button>
      </form>
      {error && <p role="alert" className="mt-2 text-[11px] font-bold text-rose-600">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400">Try:</span>
        {starters.map((starter) => <button key={starter} type="button" onClick={() => setBody(starter)} className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-800">{starter}</button>)}
      </div>
      {query.data && <p className="mt-3 text-[10px] font-semibold text-slate-400">{query.data.limits.used} of {query.data.limits.max} quick replies used.</p>}
    </section>

    <div className="mt-6">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : query.data && (query.data.templates.length === 0
        ? <SellerEmptyState title="No quick replies yet" description="Save your most common answers and insert them with one tap while chatting." />
        : <ul className="grid gap-3 md:grid-cols-2" role="list" aria-label="Your quick replies">
          {query.data.templates.map((template: any) => <TemplateRow key={template.id} template={template} onSave={(data) => update.mutate({ id: template.id, data })} onDelete={() => remove.mutate(template.id)} />)}
        </ul>)}
    </div>
  </DashboardLayout>;
}

function TemplateRow({ template, onSave, onDelete }: { template: any; onSave: (data: unknown) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(template.body);
  return <li className="rounded-card border bg-white p-4" role="listitem">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-extrabold">{template.name}</p>
      <span className="text-[9px] font-bold text-slate-400">used {template.usageCount}×</span>
    </div>
    {editing ? <div className="mt-2 space-y-2">
      <label className="sr-only" htmlFor={`edit-${template.id}`}>Edit reply text</label>
      <textarea id={`edit-${template.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={500} className="input-base py-2 text-xs" />
      <div className="flex gap-2">
        <button type="button" onClick={() => { onSave({ body: body.trim() }); setEditing(false); }} className="h-9 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white">Save</button>
        <button type="button" onClick={() => { setBody(template.body); setEditing(false); }} className="h-9 rounded-control border px-3 text-[10px] font-bold">Cancel</button>
      </div>
    </div> : <p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-slate-600">{template.body}</p>}
    {!editing && <div className="mt-3 flex items-center gap-2 border-t pt-3">
      <button type="button" onClick={() => void navigator.clipboard?.writeText(template.body).catch(() => undefined)} className="h-8 rounded-control border px-3 text-[10px] font-extrabold">Copy</button>
      <button type="button" onClick={() => setEditing(true)} className="h-8 rounded-control border px-3 text-[10px] font-bold text-violet-700">Edit</button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${template.name}`} className="ml-auto grid h-8 w-8 place-items-center rounded-control border border-rose-200 text-rose-600"><Trash2 size={13} aria-hidden="true" /></button>
    </div>}
  </li>;
}
