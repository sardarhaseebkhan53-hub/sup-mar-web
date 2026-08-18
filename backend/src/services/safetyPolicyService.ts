import { SAFETY_OVERVIEW, SAFETY_PAGES } from '../constants/safetyPolicies.js';

export function listSafetyPages() {
  return { overview: SAFETY_OVERVIEW, pages: SAFETY_PAGES.map((page) => ({ slug: page.slug, title: page.title, intro: page.intro })) };
}

export function getSafetyPage(slug: string) {
  if (!slug || slug === 'overview') return SAFETY_OVERVIEW;
  return SAFETY_PAGES.find((page) => page.slug === slug) || null;
}

export function safetyPolicyText(topic: string) {
  const key = topic.toLowerCase();
  const page = SAFETY_PAGES.find((item) => key.includes(item.slug) || item.title.toLowerCase().includes(key.split(' ')[0] || 'x'));
  if (page) return { topic: page.slug, text: `${page.intro} ${page.sections.map((section) => section.text).join(' ')}`, source: 'According to the QAVLIO Safety Center.' };
  return { topic: 'overview', text: SAFETY_OVERVIEW.intro, source: 'According to the QAVLIO Safety Center.' };
}
