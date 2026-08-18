import { SITE_URL } from './Seo';

interface Crumb { label: string; path?: string; }

/** Schema.org BreadcrumbList — mirrors the visible breadcrumbs. */
export function breadcrumbJsonLd(items: Crumb[]): object {
  const crumbs = items.filter((item) => item.label);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };
}

/** Schema.org WebSite (with search action). */
export function webSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'QAVLIO',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Schema.org Organization — only real, public information. */
export function organizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'QAVLIO',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    sameAs: [],
  };
}

/** Schema.org ItemList for category/search results. */
export function itemListJsonLd(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

interface ProductData {
  name: string;
  url: string;
  image?: string | null;
  description?: string;
  price?: number;
  currency?: string;
  brand?: string;
  condition?: string;
}

/** Schema.org Product + Offer for a public listing. */
export function productJsonLd(product: ProductData): object {
  const offer = product.price !== undefined && product.price !== null && Number.isFinite(product.price)
    ? { '@type': 'Offer', priceCurrency: product.currency || 'PKR', price: product.price, availability: 'https://schema.org/InStock', url: product.url }
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.image ? { image: product.image } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.condition ? { itemCondition: `https://schema.org/${product.condition}` } : {}),
    ...(offer ? { offers: offer } : {}),
  };
}
