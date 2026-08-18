import { useState } from 'react';
import { Modal } from '../ui/Modal';
import type { AlertFrequency } from '../../types/discovery';

export default function SavedSearchModal({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: { name: string; alertEnabled: boolean; alertFrequency: AlertFrequency }) => Promise<void> | void;
  initial?: { name?: string; alertEnabled?: boolean; alertFrequency?: AlertFrequency };
}) {
  const [name, setName] = useState(initial?.name || '');
  const [alertEnabled, setAlertEnabled] = useState(initial?.alertEnabled ?? true);
  const [alertFrequency, setAlertFrequency] = useState<AlertFrequency>(initial?.alertFrequency || 'daily');
  const [busy, setBusy] = useState(false);
  return <Modal open={open} title="Save Search" description="Get notified when matching QAVLIO listings appear." onClose={onClose}>
    <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await onSave({ name: name.trim(), alertEnabled, alertFrequency }); onClose(); } finally { setBusy(false); } }} className="space-y-4">
      <label className="block text-xs font-extrabold">Name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="input-base mt-1 !h-11 text-sm" placeholder="iPhone under 150k" /></label>
      <label className="flex items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold"><span>Alert</span><input type="checkbox" checked={alertEnabled} onChange={(event) => setAlertEnabled(event.target.checked)} className="h-5 w-5 accent-violet-600" /></label>
      <fieldset disabled={!alertEnabled} className="grid grid-cols-3 gap-2">
        {(['instant', 'daily', 'weekly'] as AlertFrequency[]).map((value) => <label key={value} className={`grid h-10 place-items-center rounded-control border text-[11px] font-extrabold capitalize ${alertFrequency === value ? 'border-violet-600 bg-violet-50 text-violet-700' : 'text-slate-600'}`}><input type="radio" name="frequency" className="sr-only" checked={alertFrequency === value} onChange={() => setAlertFrequency(value)} />{value}</label>)}
      </fieldset>
      <button type="submit" disabled={busy} className="h-11 w-full rounded-control bg-violet-600 text-xs font-extrabold text-white">{busy ? 'Saving…' : 'Save'}</button>
    </form>
  </Modal>;
}
