import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { buyerApi } from '../../services/apiClient';

export default function FollowButton({ sellerId, className = '' }: { sellerId: string; className?: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['follow', sellerId], enabled: Boolean(user && sellerId), queryFn: async () => (await buyerApi.followStatus(sellerId)).data });
  const following = Boolean(query.data?.following);
  const mutation = useMutation({
    mutationFn: () => following ? buyerApi.unfollow(sellerId) : buyerApi.follow(sellerId),
    onSuccess: async () => { client.setQueryData(['follow', sellerId], { following: !following }); await client.invalidateQueries({ queryKey: ['following'] }); },
  });
  if (!user) return <Link to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} className={`inline-flex h-10 items-center justify-center gap-2 rounded-control border px-4 text-xs font-extrabold ${className}`}><UserPlus size={14} /> Follow</Link>;
  return <button type="button" onClick={() => mutation.mutate()} aria-pressed={following} className={`inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 text-xs font-extrabold ${following ? 'border border-violet-200 bg-violet-50 text-violet-700' : 'bg-ink-950 text-white'} ${className}`}>
    {following ? <UserCheck size={14} /> : <UserPlus size={14} />}{following ? 'Following' : 'Follow Seller'}
  </button>;
}
