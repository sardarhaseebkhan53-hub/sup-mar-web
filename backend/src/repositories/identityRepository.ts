import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AccountLinkRequest } from '../models/AccountLinkRequest.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { VerificationChallenge } from '../models/VerificationChallenge.js';
import { resetSellerProfileRepository } from './sellerProfileRepository.js';

const copy = (value) => (value == null ? value : structuredClone(value));
const id = () => crypto.randomUUID();

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ||= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

class MemoryIdentityRepository {
  users: Map<string, any>;
  sessions: Map<string, any>;
  challenges: Map<string, any>;
  events: Map<string, any>;
  links: Map<string, any>;

  constructor() { this.reset(); }
  reset() {
    this.users = new Map();
    this.sessions = new Map();
    this.challenges = new Map();
    this.events = new Map();
    this.links = new Map();
  }

  async createUser(data) {
    const now = new Date();
    const user = { _id: id(), ...copy(data), createdAt: now, updatedAt: now };
    this.users.set(user._id, user);
    return copy(user);
  }
  async findUserById(userId, { includePassword = false } = {}) {
    const user = this.users.get(String(userId));
    if (!user) return null;
    const result = copy(user);
    if (!includePassword) delete result.passwordHash;
    return result;
  }
  async findUserByEmail(email, options = {}) { return this.#findUser((user) => user.email === email, options); }
  async findUserByPhone(phone, options = {}) { return this.#findUser((user) => user.phone === phone, options); }
  async findUserByUsername(username, options = {}) { return this.#findUser((user) => user.username === username, options); }
  async findUserByIdentifier(identifier, options = {}) { return identifier.includes('@') ? this.findUserByEmail(identifier, options) : this.findUserByPhone(identifier, options); }
  #findUser(predicate, { includePassword = false }: any = {}) {
    const user = [...this.users.values()].find(predicate);
    if (!user) return null;
    const result = copy(user);
    if (!includePassword) delete result.passwordHash;
    return result;
  }
  async updateUser(userId, updates) {
    const user = this.users.get(String(userId));
    if (!user) return null;
    for (const [path, value] of Object.entries(updates)) setPath(user, path, copy(value));
    user.updatedAt = new Date();
    return copy(user);
  }
  async listUsers({ search = '', status, role, limit = 25 }: any = {}) {
    const needle = search.toLowerCase();
    return [...this.users.values()]
      .filter((user) => !needle || [user.name, user.email, user.phone, user.username].some((value) => String(value || '').toLowerCase().includes(needle)))
      .filter((user) => !status || user.status === status)
      .filter((user) => !role || user.roles.includes(role))
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map((user) => { const result = copy(user); delete result.passwordHash; delete result.security; return result; });
  }

  async createSession(data) { const record = { _id: id(), ...copy(data), createdAt: new Date(), updatedAt: new Date() }; this.sessions.set(record._id, record); return copy(record); }
  async findSessionById(sessionId) { return copy(this.sessions.get(String(sessionId)) || null); }
  async findSessionByTokenHash(tokenHash) { return copy([...this.sessions.values()].find((session) => session.tokenHash === tokenHash) || null); }
  async revokeSession(sessionId, reason, at = new Date()) { const session = this.sessions.get(String(sessionId)); if (!session) return null; session.revokedAt = at; session.revokeReason = reason; return copy(session); }
  async revokeFamily(familyId, reason) { for (const session of this.sessions.values()) if (session.familyId === familyId && !session.revokedAt) { session.revokedAt = new Date(); session.revokeReason = reason; } }
  async revokeAllUserSessions(userId, reason, exceptSessionId = null) { for (const session of this.sessions.values()) if (session.userId === String(userId) && session._id !== String(exceptSessionId) && !session.revokedAt) { session.revokedAt = new Date(); session.revokeReason = reason; } }
  async touchSession(sessionId) { const session = this.sessions.get(String(sessionId)); if (session) session.lastActiveAt = new Date(); }
  async listActiveSessions(userId) { return [...this.sessions.values()].filter((session) => session.userId === String(userId) && !session.revokedAt && new Date(session.expiresAt) > new Date()).sort((a, b) => b.lastActiveAt - a.lastActiveAt).map(copy); }

  async createChallenge(data) { const record = { _id: id(), ...copy(data), createdAt: new Date(), updatedAt: new Date() }; this.challenges.set(record._id, record); return copy(record); }
  async findLatestChallenge(target, purpose) { return copy([...this.challenges.values()].filter((record) => record.target === target && record.purpose === purpose).sort((a, b) => b.createdAt - a.createdAt)[0] || null); }
  async updateChallenge(challengeId, updates) { const record = this.challenges.get(String(challengeId)); if (!record) return null; Object.assign(record, copy(updates), { updatedAt: new Date() }); return copy(record); }
  async invalidateChallenges(target, purpose) { for (const record of this.challenges.values()) if (record.target === target && record.purpose === purpose && !record.consumedAt) record.consumedAt = new Date(); }

  async createSecurityEvent(data) { const record = { _id: id(), ...copy(data), createdAt: new Date() }; this.events.set(record._id, record); return copy(record); }
  async listSecurityEvents({ userId, limit = 50 }: any = {}) { return [...this.events.values()].filter((event) => !userId || event.userId === String(userId)).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map(copy); }

  async createLinkRequest(data) { const record = { _id: id(), ...copy(data), createdAt: new Date(), updatedAt: new Date() }; this.links.set(record._id, record); return copy(record); }
  async findLinkRequest(linkId) { return copy(this.links.get(String(linkId)) || null); }
  async updateLinkRequest(linkId, updates) { const record = this.links.get(String(linkId)); if (!record) return null; Object.assign(record, copy(updates), { updatedAt: new Date() }); return copy(record); }
}

class MongoIdentityRepository {
  createUser(data) { return User.create(data).then((value) => value.toObject()); }
  findUserById(userId, { includePassword = false } = {}) { const query = User.findById(userId); if (includePassword) query.select('+passwordHash'); return query.lean(); }
  findUserByEmail(email, options = {}) { return this.#find({ email }, options); }
  findUserByPhone(phone, options = {}) { return this.#find({ phone }, options); }
  findUserByUsername(username, options = {}) { return this.#find({ username }, options); }
  findUserByIdentifier(identifier, options = {}) { return this.#find(identifier.includes('@') ? { email: identifier } : { phone: identifier }, options); }
  #find(filter, { includePassword = false } = {}) { const query = User.findOne(filter); if (includePassword) query.select('+passwordHash'); return query.lean(); }
  updateUser(userId, updates) { return User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true }).select('+passwordHash').lean(); }
  listUsers({ search = '', status, role, limit = 25 }: any = {}) {
    const filter: any = {};
    if (search) filter.$or = ['name', 'email', 'phone', 'username'].map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
    if (status) filter.status = status;
    if (role) filter.roles = role;
    return User.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  createSession(data) { return Session.create(data).then((value) => value.toObject()); }
  findSessionById(sessionId) { return Session.findById(sessionId).select('+tokenHash').lean(); }
  findSessionByTokenHash(tokenHash) { return Session.findOne({ tokenHash }).select('+tokenHash').lean(); }
  revokeSession(sessionId, reason, at = new Date()) { return Session.findByIdAndUpdate(sessionId, { $set: { revokedAt: at, revokeReason: reason } }, { new: true }).lean(); }
  revokeFamily(familyId, reason) { return Session.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: reason } }); }
  revokeAllUserSessions(userId, reason, exceptSessionId = null) { const filter: any = { userId, revokedAt: null }; if (exceptSessionId) filter._id = { $ne: exceptSessionId }; return Session.updateMany(filter, { $set: { revokedAt: new Date(), revokeReason: reason } }); }
  touchSession(sessionId) { return Session.findByIdAndUpdate(sessionId, { $set: { lastActiveAt: new Date() } }); }
  listActiveSessions(userId) { return Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ lastActiveAt: -1 }).lean(); }

  createChallenge(data) { return VerificationChallenge.create(data).then((value) => value.toObject()); }
  findLatestChallenge(target, purpose) { return VerificationChallenge.findOne({ target, purpose }).sort({ createdAt: -1 }).select('+secretHash').lean(); }
  updateChallenge(challengeId, updates) { return VerificationChallenge.findByIdAndUpdate(challengeId, { $set: updates }, { new: true }).select('+secretHash').lean(); }
  invalidateChallenges(target, purpose) { return VerificationChallenge.updateMany({ target, purpose, consumedAt: null }, { $set: { consumedAt: new Date() } }); }

  createSecurityEvent(data) { return SecurityEvent.create(data).then((value) => value.toObject()); }
  listSecurityEvents({ userId, limit = 50 }: any = {}) { return SecurityEvent.find(userId ? { userId } : {}).sort({ createdAt: -1 }).limit(limit).lean(); }

  createLinkRequest(data) { return AccountLinkRequest.create(data).then((value) => value.toObject()); }
  findLinkRequest(linkId) { return AccountLinkRequest.findById(linkId).lean(); }
  updateLinkRequest(linkId, updates) { return AccountLinkRequest.findByIdAndUpdate(linkId, { $set: updates }, { new: true }).lean(); }
}

const memoryRepository = new MemoryIdentityRepository();
const mongoRepository = new MongoIdentityRepository();

export function getIdentityRepository() {
  return mongoose.connection.readyState === 1 ? mongoRepository : memoryRepository;
}

export function resetIdentityRepository() { memoryRepository.reset(); resetSellerProfileRepository(); }
