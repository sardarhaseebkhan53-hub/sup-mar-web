export interface TrustBadgeItem { key: string; label: string; tone: string }
export interface ReviewItem {
  id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  helpfulCount?: number;
  reviewerName?: string;
  reviewerAvatar?: string | null;
  response?: { text: string; createdAt: string } | null;
  status?: string;
  listingId?: string;
}
export interface ReviewSummary { average: number; count: number; distribution: Record<number, number> }
