/**
 * Social auth capabilities are now driven by live environment configuration
 * (GOOGLE_CLIENT_ID/SECRET, APPLE_*, MICROSOFT_*, FACEBOOK_*).
 * This lets the admin panel accurately report CONFIGURED / NOT CONFIGURED
 * without ever exposing secrets to the frontend.
 */

type Provider = 'google' | 'facebook' | 'apple' | 'microsoft';

const ENV_MAP: Record<Provider, { id: string; secret: string }> = {
  google: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET' },
  apple: { id: 'APPLE_CLIENT_ID', secret: 'APPLE_PRIVATE_KEY' },
  microsoft: { id: 'MICROSOFT_CLIENT_ID', secret: 'MICROSOFT_CLIENT_SECRET' },
  facebook: { id: 'FACEBOOK_APP_ID', secret: 'FACEBOOK_APP_SECRET' },
};

function isConfigured(provider: Provider) {
  const map = ENV_MAP[provider];
  if (!map) return false;
  return Boolean((process.env[map.id] || '').trim()) && Boolean((process.env[map.secret] || '').trim());
}

export function socialAuthCapabilities() {
  const providers: Provider[] = ['google', 'facebook', 'apple', 'microsoft'];
  return providers.map((provider) => ({
    provider,
    configured: isConfigured(provider),
    protocol: 'OIDC/OAuth 2.0 Authorization Code with PKCE',
  }));
}

export function getSocialAuthAdapter(provider: string) {
  const list: Provider[] = ['google', 'facebook', 'apple', 'microsoft'];
  if (!list.includes(provider as Provider)) return null;
  const p = provider as Provider;
  if (!isConfigured(p)) return { provider, configured: false };
  return { provider, configured: true };
}

export const socialProviderEnvMap = ENV_MAP;
