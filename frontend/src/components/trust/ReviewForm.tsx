import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { trustApi } from '../../services/apiClient';
import RatingStars from './RatingStars';

export default function ReviewForm({ username, listingId, onDone }: { username: string; listingId?: string; onDone?: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => trustApi.createReview(username, { listingId, rating, title, comment }),
    onSuccess: () => { setTitle(''); setComment(''); setRating(0); onDone?.(); },
  });
  return <form onSubmit={(event) => { event.preventDefault(); if (rating) submit.mutate(); }} className="rounded-panel border border-violet-100 bg-violet-50/50 p-5">
    <h2 className="text-base font-extrabold">How was your experience?</h2>
    <p className="mt-1 text-xs text-slate-500">Reviews are only for QAVLIO conversations about this seller’s listings.</p>
    <div className="mt-4"><RatingStars value={rating} onChange={setRating} /></div>
    <label className="mt-4 block text-xs font-extrabold">Title
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="input-base mt-2" placeholder="Optional short title" />
    </label>
    <label className="mt-3 block text-xs font-extrabold">Comment
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} className="input-base mt-2 min-h-28 py-3" placeholder="Share what a future buyer should know." />
    </label>
    {submit.error && <p role="alert" className="mt-3 text-xs font-bold text-red-600">{submit.error.message}</p>}
    <button type="submit" disabled={!rating || submit.isPending} className="mt-4 h-11 rounded-control bg-violet-600 px-5 text-xs font-extrabold text-white disabled:opacity-50">Submit Review</button>
  </form>;
}
