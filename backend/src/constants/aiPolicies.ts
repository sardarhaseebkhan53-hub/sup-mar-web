/** Trusted QAVLIO knowledge. The AI may only cite these facts for policy answers. */
export const MARKETPLACE_POLICIES = Object.freeze({
  brand: 'QAVLIO',
  role: 'QAVLIO is a marketplace for discovering and listing items. It does not guarantee off-platform exchanges.',
  listing: {
    howToCreate: 'Sign in, open Sell, choose a category, add an honest title, description, price, photos, and location, then publish. Your first listing may be free depending on the current marketplace quota.',
    photos: 'Add clear photos you own. Do not use misleading images.',
    prohibited: 'Illegal, misleading, abusive, and unsafe listings are not allowed. Report them instead of engaging.',
  },
  payments: {
    process: 'Listing fees and promotions are quoted in PKR before checkout. QAVLIO never asks for card details inside chat.',
    statuses: {
      pending: 'Your payment is currently marked as Pending. Complete checkout or wait for the provider to confirm it.',
      processing: 'Your payment is currently marked as Processing. This usually updates automatically after the provider confirms it.',
      paid: 'Your payment is marked as Paid. A receipt is available in Seller billing.',
      failed: 'Your payment is marked as Failed. Your listing remains saved so you can try again.',
      cancelled: 'Your payment is marked as Cancelled. You can start a new checkout from the listing.',
      refunded: 'Your payment is marked as Refunded. Refunds are processed only through the normal billing workflow.',
      expired: 'Your payment is marked as Expired. Start a new checkout if you still want to publish or promote.',
    },
    credentials: 'Never share card numbers, OTPs, or banking passwords. QAVLIO support will never ask for them.',
  },
  promotions: {
    how: 'Promote a published listing from Seller Centre. Paid placements are labeled Promoted.',
    cannotInvent: 'Promotion prices come from marketplace settings, not from the assistant.',
  },
  chat: {
    messageSellers: 'Open a listing and use Contact seller. Conversations stay on QAVLIO.',
    block: 'Open the conversation, then use Block. You will stop receiving messages from that person.',
    report: 'Use Report on a listing or conversation. Include what happened. Do not send passwords or payment secrets.',
    notifications: 'Manage alerts from Account → Notifications. Message, listing, and security alerts can be toggled separately.',
  },
  account: {
    login: 'Use your email/phone and password, or phone OTP, from the Login page.',
    signup: 'Create an account from Register, then verify email or phone.',
    passwordReset: 'Use Forgot password. QAVLIO will never ask you to send a password in chat.',
    profile: 'Update your name, photo, and location from Account → Profile.',
    listings: 'Manage drafts, published, paused, and sold items from Seller Centre.',
  },
  safety: {
    meet: 'Meet in a public place, tell someone your plan, and inspect the item before paying.',
    inspect: 'Do not rely on urgency, screenshots, or promises alone.',
    privacy: 'QAVLIO shows an approximate area, not a private address.',
  },
  support: {
    escalate: 'If this assistant cannot resolve the issue, create a support request. A human teammate will follow up.',
  },
  aiLimits: {
    cannot: [
      'approve or publish listings',
      'refund payments',
      'suspend or ban users',
      'change prices',
      'modify account permissions',
      'change admin settings',
      'activate promotions',
    ],
  },
});

export const CITIES = Object.freeze(['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad']);

export const CATEGORY_ALIASES: Record<string, string> = {
  phone: 'mobiles', phones: 'mobiles', mobile: 'mobiles', mobiles: 'mobiles', iphone: 'mobiles', smartphone: 'mobiles', tablet: 'mobiles',
  car: 'cars', cars: 'cars', vehicle: 'vehicles', vehicles: 'vehicles', automobile: 'cars', sedan: 'cars',
  motorcycle: 'motorcycles', bike: 'motorcycles', motorbike: 'motorcycles',
  laptop: 'computers-laptops', laptops: 'computers-laptops', computer: 'computers-laptops', pc: 'computers-laptops', desktop: 'computers-laptops',
  furniture: 'furniture', sofa: 'furniture', chair: 'furniture', table: 'furniture',
  tv: 'electronics', television: 'electronics', camera: 'electronics', gaming: 'electronics', console: 'electronics', ps5: 'electronics',
  house: 'property', apartment: 'property', plot: 'property', rent: 'property',
  job: 'jobs', jobs: 'jobs',
  service: 'services', services: 'services',
};

export const BRAND_ALIASES: Record<string, { brand: string; category?: string }> = {
  apple: { brand: 'Apple', category: 'mobiles' },
  iphone: { brand: 'Apple', category: 'mobiles' },
  samsung: { brand: 'Samsung' },
  xiaomi: { brand: 'Xiaomi', category: 'mobiles' },
  google: { brand: 'Google', category: 'mobiles' },
  oneplus: { brand: 'OnePlus', category: 'mobiles' },
  toyota: { brand: 'Toyota', category: 'cars' },
  honda: { brand: 'Honda' },
  suzuki: { brand: 'Suzuki', category: 'cars' },
  kia: { brand: 'Kia', category: 'cars' },
  hyundai: { brand: 'Hyundai', category: 'cars' },
};

export const QUICK_PROMPTS = Object.freeze([
  'Find a used iPhone under Rs. 150,000',
  'Show cars under Rs. 3 million',
  'Help me sell my phone',
  'How do I promote my listing?',
  'Why is my payment pending?',
  'Find furniture near me',
  'Compare these listings',
]);
