const providerConfiguration = Object.freeze({ google: false, facebook: false, apple: false });

export function socialAuthCapabilities() {
  return Object.entries(providerConfiguration).map(([provider, configured]) => ({
    provider,
    configured,
    protocol: 'OIDC/OAuth 2.0 Authorization Code with PKCE',
  }));
}

export function getSocialAuthAdapter(provider) {
  if (!(provider in providerConfiguration)) return null;
  return { provider, configured: providerConfiguration[provider] };
}
