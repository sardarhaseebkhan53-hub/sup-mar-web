export function presentUser(user) {
  if (!user) return null;
  const value = typeof user.toObject === 'function' ? user.toObject() : structuredClone(user);
  delete value.passwordHash;
  delete value.avatarKey;
  delete value.security;
  delete value.deletedAt;
  value.id = String(value._id || value.id);
  delete value._id;
  delete value.__v;
  return value;
}

export function presentSession(session, currentSessionId) {
  return {
    id: String(session._id || session.id),
    device: session.device,
    browser: session.browser,
    platform: session.platform,
    approximateLocation: session.ipApproximation,
    loginAt: session.loginAt,
    lastActiveAt: session.lastActiveAt,
    expiresAt: session.expiresAt,
    current: String(session._id || session.id) === String(currentSessionId),
  };
}
