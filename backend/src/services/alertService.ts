import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AlertEvent } from '../models/AlertEvent.js';
import { deliverNotification } from '../notifications/NotificationProvider.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/buyerExperience.js';
import { favoritesForListing, listFavoriteRecords, markFavoritePrice } from './favoriteService.js';
import { followersOfSeller } from './followService.js';
import { listingMatchesSearch, listAlertEnabledSearches, markSearchMatch } from './savedSearchService.js';
import { getPublicSellerByUserId } from './publicSellerService.js';

type AlertType = 'saved_search' | 'saved_search_digest' | 'price_alert' | 'price_digest' | 'seller_update' | 'listing_status';
type MemoryEvent = { id: string; userId: string; savedSearchId: string; listingId: string; type: AlertType; sentAt: Date; digestKey: string };
const events = new Map<string, MemoryEvent>();
const connected = () => mongoose.connection.readyState === 1;
export function resetAlertMemory() { events.clear(); }

function eventKey(input: { userId: string; savedSearchId?: string; listingId?: string; type: string }) {
  return `${input.userId}:${input.savedSearchId || ''}:${input.listingId || ''}:${input.type}`;
}

async function alreadySent(input: { userId: string; savedSearchId?: string; listingId?: string; type: AlertType }) {
  if (connected()) return Boolean(await AlertEvent.exists({ userId: input.userId, savedSearchId: input.savedSearchId || '', listingId: input.listingId || '', type: input.type }));
  return events.has(eventKey(input));
}

async function recordEvent(input: { userId: string; savedSearchId?: string; listingId?: string; type: AlertType; digestKey?: string }) {
  const payload = { userId: input.userId, savedSearchId: input.savedSearchId || '', listingId: input.listingId || '', type: input.type, sentAt: new Date(), digestKey: input.digestKey || '' };
  if (connected()) {
    try { await AlertEvent.create(payload); } catch (error: any) { if (error?.code !== 11000) throw error; }
    return;
  }
  const id = crypto.randomUUID();
  events.set(eventKey(payload), { id, ...payload });
}

async function prefsFor(userId: string) {
  const user = await getIdentityRepository().findUserById(userId);
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(user?.preferences?.notifications || {}), emailAddress: user?.email || '' };
}

async function dailyCount(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (connected()) return AlertEvent.countDocuments({ userId, sentAt: { $gte: since } });
  return [...events.values()].filter((item) => item.userId === userId && +item.sentAt >= +since).length;
}

function inQuietHours(now = new Date()) {
  if (env.nodeEnv === 'test') return false;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }).format(now));
  return hour >= 22 || hour < 7;
}

function frequencyDue(frequency: string, lastNotifiedAt?: Date | null) {
  if (!lastNotifiedAt) return true;
  const elapsed = Date.now() - +new Date(lastNotifiedAt);
  if (frequency === 'weekly') return elapsed >= 7 * 24 * 60 * 60 * 1000;
  if (frequency === 'daily') return elapsed >= 24 * 60 * 60 * 1000;
  return true;
}

async function notify(userId: string, input: { type: AlertType; title: string; body: string; relatedId?: string; relatedType?: 'listing' | 'search' | 'seller'; prefKey: 'savedSearchAlerts' | 'priceAlerts' | 'sellerUpdates' | 'listingAvailability'; email?: boolean }) {
  const prefs = await prefsFor(userId);
  if (prefs[input.prefKey] === false) return null;
  if (prefs.inApp === false && !prefs.email) return null;
  if (await dailyCount(userId) >= env.discovery.alertDailyCap) return null;
  return deliverNotification({
    userId,
    type: input.type === 'seller_update' ? 'seller_update' : input.type === 'listing_status' ? 'listing_status' : input.type === 'price_alert' || input.type === 'price_digest' ? 'price_alert' : 'saved_search',
    title: input.title,
    body: input.body,
    relatedId: input.relatedId,
    relatedType: input.relatedType,
    email: prefs.email && input.email ? { to: prefs.emailAddress, subject: input.title } : undefined,
  }, { inApp: prefs.inApp !== false, email: Boolean(prefs.email && input.email) });
}

export function enqueueAlert(task: () => Promise<unknown>) {
  if (env.nodeEnv === 'test') return task();
  setImmediate(() => { task().catch(() => undefined); });
  return undefined;
}

export async function processSavedSearchAlerts(listing: any) {
  if (!listing || listing.status !== 'published') return [];
  const searches = await listAlertEnabledSearches();
  const sent: any[] = [];
  const digestBuckets = new Map<string, { search: any; listings: any[] }>();
  for (const search of searches) {
    if (String(search.userId) === String(listing.sellerId || '')) continue;
    if (!listingMatchesSearch(listing, search)) continue;
    if (search.alertFrequency === 'instant' && inQuietHours()) {
      await markSearchMatch(String(search.id || search._id), false);
      continue;
    }
    if (search.alertFrequency === 'instant') {
      const exists = await alreadySent({ userId: String(search.userId), savedSearchId: String(search.id || search._id), listingId: listing.publicId, type: 'saved_search' });
      if (exists) continue;
      await recordEvent({ userId: String(search.userId), savedSearchId: String(search.id || search._id), listingId: listing.publicId, type: 'saved_search' });
      await markSearchMatch(String(search.id || search._id), true);
      await notify(String(search.userId), {
        type: 'saved_search',
        title: 'New listing matches your saved search.',
        body: `${listing.title} is now on QAVLIO.`,
        relatedId: String(search.id || search._id),
        relatedType: 'search',
        prefKey: 'savedSearchAlerts',
      });
      sent.push(search);
      continue;
    }
    const bucketKey = String(search.id || search._id);
    const bucket = digestBuckets.get(bucketKey) || { search, listings: [] };
    bucket.listings.push(listing);
    digestBuckets.set(bucketKey, bucket);
    await markSearchMatch(bucketKey, false);
  }
  for (const { search, listings } of digestBuckets.values()) {
    if (!frequencyDue(search.alertFrequency, search.lastNotifiedAt)) continue;
    const digestType = 'saved_search_digest' as const;
    const digestKey = `${search.alertFrequency}:${new Date().toISOString().slice(0, 10)}`;
    const exists = await alreadySent({ userId: String(search.userId), savedSearchId: String(search.id || search._id), listingId: digestKey, type: digestType });
    if (exists) continue;
    await recordEvent({ userId: String(search.userId), savedSearchId: String(search.id || search._id), listingId: digestKey, type: digestType, digestKey });
    await markSearchMatch(String(search.id || search._id), true, 0);
    const count = Math.max(listings.length, search.pendingMatchCount || listings.length);
    await notify(String(search.userId), {
      type: digestType,
      title: `${count} new listing${count === 1 ? '' : 's'} match your saved search.`,
      body: `Open “${search.name}” to review matching QAVLIO listings.`,
      relatedId: String(search.id || search._id),
      relatedType: 'search',
      prefKey: 'savedSearchAlerts',
    });
    sent.push(search);
  }
  return sent;
}

export async function processPriceAlerts(listing: any, previousPrice: number, nextPrice: number) {
  if (!listing || previousPrice === nextPrice) return [];
  if (!['published'].includes(listing.status)) return [];
  const favorites = await favoritesForListing(listing.publicId);
  const dropped = nextPrice < previousPrice;
  const recipients: string[] = [];
  for (const favorite of favorites as any[]) {
    const userId = String(favorite.userId);
    if (await alreadySent({ userId, listingId: listing.publicId, type: 'price_alert', savedSearchId: `${previousPrice}:${nextPrice}` })) continue;
    await recordEvent({ userId, listingId: listing.publicId, type: 'price_alert', savedSearchId: `${previousPrice}:${nextPrice}` });
    await markFavoritePrice(userId, listing.publicId, nextPrice);
    await notify(userId, {
      type: 'price_alert',
      title: dropped ? 'Price dropped!' : 'Price updated',
      body: dropped
        ? `${listing.title}: Rs. ${Number(previousPrice).toLocaleString()} → Rs. ${Number(nextPrice).toLocaleString()}`
        : `${listing.title} is now Rs. ${Number(nextPrice).toLocaleString()}.`,
      relatedId: listing.publicId,
      relatedType: 'listing',
      prefKey: 'priceAlerts',
    });
    recipients.push(userId);
  }
  return recipients;
}

export async function processSellerAlerts(listing: any) {
  if (!listing?.sellerId || listing.status !== 'published') return [];
  const followers = await followersOfSeller(String(listing.sellerId));
  const seller = await getPublicSellerByUserId(String(listing.sellerId)).catch(() => null);
  const sent: string[] = [];
  for (const userId of followers) {
    if (userId === String(listing.sellerId)) continue;
    if (await alreadySent({ userId, listingId: listing.publicId, type: 'seller_update' })) continue;
    await recordEvent({ userId, listingId: listing.publicId, type: 'seller_update' });
    await notify(userId, {
      type: 'seller_update',
      title: `${seller?.displayName || 'A seller you follow'} posted a new listing.`,
      body: listing.title,
      relatedId: listing.publicId,
      relatedType: 'listing',
      prefKey: 'sellerUpdates',
    });
    sent.push(userId);
  }
  return sent;
}

export async function processListingStatusAlerts(listing: any) {
  if (!listing || !['sold', 'removed', 'expired'].includes(listing.status)) return [];
  const favorites = await listFavoriteRecords(listing.publicId);
  const sent: string[] = [];
  for (const favorite of favorites as any[]) {
    const userId = String(favorite.userId);
    if (await alreadySent({ userId, listingId: listing.publicId, type: 'listing_status' })) continue;
    await recordEvent({ userId, listingId: listing.publicId, type: 'listing_status' });
    await notify(userId, {
      type: 'listing_status',
      title: 'This listing is no longer available.',
      body: listing.title,
      relatedId: listing.publicId,
      relatedType: 'listing',
      prefKey: 'listingAvailability',
    });
    sent.push(userId);
  }
  return sent;
}

export async function processListingPublished(listing: any) {
  await processSavedSearchAlerts(listing);
  await processSellerAlerts(listing);
}

export function resetDiscoveryMemory() {
  events.clear();
}
