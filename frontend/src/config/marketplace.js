export const marketplaceConfig = Object.freeze({
  brand: {
    name: 'QAVLIO',
    tagline: 'Buy. Sell. Discover.',
    supportEmail: 'hello@qavlio.pk',
  },
  locale: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ur'],
    defaultCurrency: 'PKR',
    defaultCountry: 'PK',
  },
  listing: {
    // Values are public display defaults. The source of truth will be admin-managed API configuration.
    freeListingLimit: null,
    additionalListingFee: null,
    defaultDurationDays: null,
  },
  contact: {
    city: 'Rawalpindi, Pakistan',
  },
});
