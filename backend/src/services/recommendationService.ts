import mongoose from 'mongoose';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { RecentlyViewed } from '../models/RecentlyViewed.js';
import { presentAiListing } from '../ai/listings.js';
import { getPublishedMemoryListings } from './listingService.js';
import { searchListings } from './searchService.js';

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()];
}

export async function recommendListings(input: { userId?: string | null; category?: string; currentSearch?: string; exclude?: string[]; limit?: number }) {
  const limit = Math.min(input.limit || 8, 12);
  const exclude = new Set(input.exclude || []);
  const categories = new Set<string>();
  if (input.category) categories.add(input.category);

  if (input.userId && mongoose.connection.readyState === 1) {
    const [favorites, viewed] = await Promise.all([
      Favorite.find({ userId: input.userId }).sort({ createdAt: -1 }).limit(20).populate('listingId').lean(),
      RecentlyViewed.find({ userId: input.userId }).sort({ viewedAt: -1 }).limit(20).populate('listingId').lean(),
    ]);
    for (const row of [...favorites, ...viewed]) {
      const listing: any = row.listingId;
      if (listing?.categorySlug) categories.add(listing.categorySlug);
      if (listing?.publicId) exclude.add(listing.publicId);
    }
  }

  if (input.currentSearch) {
    const searched = await searchListings({ q: input.currentSearch, sort: 'recommended', page: 1, limit: 6 });
    searched.listings.forEach((item: any) => { if (item.categorySlug) categories.add(item.categorySlug); });
  }

  const personalized = categories.size > 0;
  let rows: any[] = [];
  if (mongoose.connection.readyState === 1) {
    const query: any = { status: 'published', availability: 'available' };
    if (personalized) query.categorySlug = { $in: [...categories] };
    rows = await Listing.find(query).sort({ isPromoted: -1, viewCount: -1, publishedAt: -1 }).limit(40).select('-moderation -reportCount').lean();
  } else {
    rows = catalog().filter((item: any) => item.status === 'published' && (!personalized || categories.has(item.categorySlug)));
    rows.sort((a: any, b: any) => Number(Boolean(b.isPromoted)) - Number(Boolean(a.isPromoted)) || (b.viewCount || 0) - (a.viewCount || 0));
  }

  const listings = rows.filter((item) => !exclude.has(item.publicId)).slice(0, limit).map(presentAiListing).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return {
    listings,
    personalized,
    sections: personalized
      ? [
        { id: 'interests', title: 'Based on your interests', listings: listings.slice(0, 4) },
        { id: 'more', title: 'You may also like', listings: listings.slice(4, 8) },
      ]
      : [
        { id: 'popular', title: 'Popular on QAVLIO', listings: listings.slice(0, 4) },
        { id: 'trending', title: 'Trending categories', listings: listings.slice(4, 8) },
      ],
    coldStart: !personalized,
  };
}
