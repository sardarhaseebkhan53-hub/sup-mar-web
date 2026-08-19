export const ROUTES = Object.freeze({
  home: '/', marketplace: '/marketplace', categories: '/categories', category: (slug = ':categorySlug') => `/category/${slug}`, listing: (id = ':listingId', slug = ':slug') => `/listing/${id}/${slug}`,
  about: '/about', contact: '/contact', help: '/help', aiAssistant: '/ai-assistant', safety: '/safety', terms: '/terms', privacy: '/privacy',
  login: '/login', register: '/register', sell: '/sell', customerDashboard: '/dashboard', sellerDashboard: '/seller', adminDashboard: '/admin/dashboard', adminLogin: '/admin/login', saved: '/saved', messages: '/messages',
});
