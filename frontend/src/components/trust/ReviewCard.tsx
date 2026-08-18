import { useMutation } from '@tanstack/react-query';
import { Flag, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { trustApi } from '../../services/apiClient';
import type { ReviewItem } from '../../types/trust';
import { Modal } from '../ui/Modal';
import RatingStars from './RatingStars';

export default function ReviewCard({ review, onReport }: { review: ReviewItem; onReport?: () => void }) {
  const [helpful, setHelpful] = useState(review.helpfulCount || 0);
  const vote = useMutation({ mutationFn: () => trustApi.helpful(review.id), onSuccess: (response) => setHelpful(response.data.helpfulCount) });
  return <article className="rounded-card border border-ink-900/10 bg-white p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-extrabold text-violet-700">{review.reviewerAvatar ? <img src={review.reviewerAvatar} alt="" className="h-full w-full object-cover" /> : (review.reviewerName || 'QV').slice(0, 2).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold">{review.reviewerName || 'QAVLIO user'}</p>
          <time className="text-[10px] font-semibold text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</time>
        </div>
        <div className="mt-1"><RatingStars value={review.rating} readOnly size={14} /></div>
        {review.title && <h3 className="mt-2 text-sm font-extrabold">{review.title}</h3>}
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.comment}</p>
        {review.response && <div className="mt-3 rounded-control bg-slate-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Seller response</p><p className="mt-1 text-xs leading-5 text-slate-600">{review.response.text}</p></div>}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => vote.mutate()} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-violet-700"><ThumbsUp size={13} /> Helpful{helpful ? ` · ${helpful}` : ''}</button>
          <button type="button" onClick={onReport} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-600"><Flag size={13} /> Report</button>
        </div>
      </div>
    </div>
  </article>;
}

export function ReviewReportDialog({ open, onClose, reviewId }: { open: boolean; onClose: () => void; reviewId: string }) {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const submit = useMutation({
    mutationFn: () => trustApi.reportReview(reviewId, { reason, description }),
    onSuccess: onClose,
  });
  return <Modal open={open} title="Report this review" description="Tell QAVLIO why this review needs a look. We will review it." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); submit.mutate(); }} className="space-y-3">
      <label className="block text-xs font-extrabold">Reason
        <select value={reason} onChange={(event) => setReason(event.target.value)} className="input-base mt-2">
          <option value="spam">Spam</option>
          <option value="fake-review">Fake review</option>
          <option value="abuse">Abuse</option>
          <option value="off-topic">Off-topic</option>
          <option value="manipulation">Manipulation</option>
          <option value="harassment">Harassment</option>
          <option value="offensive">Offensive content</option>
          <option value="personal-information">Personal information</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-xs font-extrabold">Details (optional)
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} className="input-base mt-2 min-h-24 py-3" />
      </label>
      {submit.error && <p className="text-xs font-bold text-red-600">{submit.error.message}</p>}
      <button type="submit" disabled={submit.isPending} className="h-11 w-full rounded-control bg-violet-600 text-xs font-extrabold text-white">Submit report</button>
    </form>
  </Modal>;
}
