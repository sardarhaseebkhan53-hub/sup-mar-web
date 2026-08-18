import { useEffect, useId } from 'react';

/**
 * SITE_URL — public canonical base. Override with VITE_SITE_URL in production;
 * falls back to the QAVLIO production domain so SEO metadata is always valid.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://qavlio.pk';

const DEFAULT_TITLE = 'QAVLIO — Buy, Sell & Discover';
const DEFAULT_DESCRIPTION = 'QAVLIO is a modern marketplace to discover great products, sell what you no longer need, and connect with people around you.';

interface SeoProps {
  title?: string;
  description?: string;
  /** Canonical path appended to SITE_URL, e.g. "/listing/abc/my-listing". */
  canonicalPath?: string;
  /** Set to true for pages that must not be indexed (private/dup content). */
  noindex?: boolean;
  ogImage?: string;
  /** JSON-LD structured data (Schema.org). Only include real information. */
  jsonLd?: object | object[];
  type?: 'website' | 'article' | 'product';
}

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  const selector = `${attr}="${key}"`;
  let el = document.head.querySelector(`meta[${selector}]`) as HTMLMetaElement | null;
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string | undefined) {
  const selector = 'link[rel="canonical"]';
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setRobots(noindex: boolean) {
  setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
}

/**
 * Manages document metadata (title, description, canonical, Open Graph,
 * Twitter, robots) and injects JSON-LD structured data. Scoped per mount —
 * restores defaults when the page using it unmounts.
 */
export function Seo({ title, description, canonicalPath, noindex = false, ogImage, jsonLd, type = 'website' }: SeoProps) {
  const id = useId();
  const pageTitle = title ? `${title} | QAVLIO` : DEFAULT_TITLE;
  const pageDescription = description || DEFAULT_DESCRIPTION;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}/`;
  const resolvedImage = ogImage || `${SITE_URL}/icons/icon-512.png`;

  useEffect(() => {
    document.title = pageTitle;
    setMeta('name', 'description', pageDescription);
    setCanonical(canonical);
    setRobots(noindex);
    setMeta('property', 'og:title', title || DEFAULT_TITLE);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', resolvedImage);
    setMeta('property', 'og:site_name', 'QAVLIO');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', title || DEFAULT_TITLE);
    setMeta('name', 'twitter:description', pageDescription);
    setMeta('name', 'twitter:image', resolvedImage);

    let script: HTMLScriptElement | null = null;
    if (jsonLd && (Array.isArray(jsonLd) ? jsonLd.length : true)) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', id);
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setCanonical(`${SITE_URL}/`);
      setRobots(false);
      if (script) script.remove();
    };
  }, [id, pageTitle, pageDescription, canonical, noindex, resolvedImage, title, type, jsonLd]);

  return null;
}
