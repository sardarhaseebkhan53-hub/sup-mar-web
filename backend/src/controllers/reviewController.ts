import { createReview, deleteReview, listMyReviews, listReviewsForSellerInbox, listSellerReviews, markHelpful, reportReview, respondToReview, reviewEligibility, updateReview } from '../services/reviewService.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';

export async function eligibility(req, res) {
  res.json({ success: true, data: await reviewEligibility(req.auth.userId, req.params.username, req.query.listingId) });
}

export async function index(req, res) {
  res.json({ success: true, data: await listSellerReviews(req.params.username, req.query) });
}

export async function create(req, res) {
  res.status(201).json({ success: true, data: await createReview(req.auth.userId, req.params.username, req.body), message: 'Review submitted' });
}

export async function patch(req, res) {
  res.json({ success: true, data: await updateReview(req.auth.userId, req.params.id, req.body) });
}

export async function remove(req, res) {
  res.json({ success: true, data: await deleteReview(req.auth.userId, req.params.id), message: 'Review removed' });
}

export async function helpful(req, res) {
  res.json({ success: true, data: await markHelpful(req.auth.userId, req.params.id) });
}

export async function respond(req, res) {
  res.json({ success: true, data: await respondToReview(req.auth.userId, req.params.id, req.body.text) });
}

export async function report(req, res) {
  res.status(201).json({ success: true, data: await reportReview(req.auth.userId, req.params.id, req.body), message: 'Thanks. QAVLIO will review this report.' });
}

export async function mine(req, res) {
  res.json({ success: true, data: await listMyReviews(req.auth.userId) });
}

export async function inbox(req, res) {
  const profile = await getSellerProfileRepository().findByUserId(req.auth.userId);
  res.json({ success: true, data: await listReviewsForSellerInbox(String(profile?.userId || req.auth.userId)) });
}
