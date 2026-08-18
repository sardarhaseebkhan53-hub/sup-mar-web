import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { trustApi } from '../../services/apiClient';
import { Modal } from '../ui/Modal';
import BlockButton from './BlockButton';

const sellerReasons = [
  ['scam', 'Scam'],
  ['harassment', 'Harassment'],
  ['spam', 'Spam'],
  ['fake-identity', 'Fake identity'],
  ['suspicious', 'Suspicious behavior'],
  ['other', 'Other'],
];

export default function ReportSellerDialog({ open, onClose, targetId, blockId }: { open: boolean; onClose: () => void; targetId: string; blockId?:string }) {
  const [reason, setReason] = useState('suspicious');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState('');
  const submit = useMutation({
    mutationFn: () => trustApi.reportUser(targetId, { reason, description, targetType: 'seller' }),
    onSuccess: (response) => setDone(`Thanks. QAVLIO will review this report. ID ${response.data.id}`),
  });
  return <Modal open={open} title="Report seller" description="Reports are reviewed by QAVLIO. This is not a public accusation." onClose={onClose}>
    {done ? <div><p className="text-sm font-semibold text-emerald-800">{done}</p>{blockId&&<div className="mt-4 rounded-card bg-slate-50 p-3"><p className="text-xs text-slate-600">Would you also like to block this user?</p><div className="mt-2"><BlockButton userId={blockId}/></div></div>}</div> : <form onSubmit={(event) => { event.preventDefault(); submit.mutate(); }} className="space-y-3">
      <fieldset>
        <legend className="text-xs font-extrabold">Reason</legend>
        <div className="mt-2 grid gap-2">{sellerReasons.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-control border p-3 text-xs font-bold"><input type="radio" name="reason" checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</div>
      </fieldset>
      <label className="block text-xs font-extrabold">Details (optional)
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} className="input-base mt-2 min-h-24 py-3" />
      </label>
      {submit.error && <p className="text-xs font-bold text-red-600">{submit.error.message}</p>}
      <button type="submit" disabled={submit.isPending} className="h-11 w-full rounded-control bg-violet-600 text-xs font-extrabold text-white">Submit report</button>
    </form>}
  </Modal>;
}
