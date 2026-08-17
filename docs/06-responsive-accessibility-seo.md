# 6. Responsive, Accessibility, SEO, and Performance Rules

## 6.1 Responsive system

Tailwind breakpoints are content-driven guides, not device detection:

| Range | Layout behavior |
|---|---|
| `<640px` | Single-column task flows; mobile search row and bottom nav; horizontal category/step rails; filters collapse |
| `640–767px` | Two-column cards/forms where content remains readable |
| `768–1023px` | Tablet grids; more header density; dashboard still uses horizontal section rail |
| `1024–1279px` | Desktop category nav, side filters, dashboard sidebar, hero artwork |
| `≥1280px` | Three/five-card grids and complete desktop utility navigation |

### Component rules

- **Header:** desktop integrates category/search/location and account actions. Mobile uses a clear menu, compact logo/alerts, full-width search, and fixed task nav.
- **Search:** retains a dominant query field on every size. Secondary category/location controls move into filters when space is limited.
- **Hero:** artwork is removed below desktop rather than squeezed behind copy; copy/CTAs remain above fold and full-width when needed.
- **Categories:** horizontal touch-scrolling on mobile; ordered grid on larger screens; no tiny wrapped labels.
- **Listing cards:** mobile homepage uses snap scrolling; result pages use one/two-column progression; detail actions become easy-to-tap full-width controls.
- **Filters:** inline left rail on desktop; disclosure/drawer pattern on mobile. Applied filter chips remain outside the hidden panel in the final implementation.
- **Dashboards:** persistent side navigation desktop; horizontally scrolling task strip mobile; wide tables scroll inside their container, never the viewport.
- **Chat:** conversation list and active room become separate mobile states in the functional phase; Phase 1 shows a stacked preview.
- **Ads:** creative selected by slot/device. Reserve dimensions; never cover content, push a primary CTA off-screen, or mimic an organic card.
- **Forms:** labels above fields; logical groupings; one column mobile, selective two-column desktop; sticky bottom action only if it does not obscure controls.

## 6.2 Overflow and localization resilience

Set `min-width: 0` on flex/grid content, truncate metadata where safe, wrap titles, and constrain media. Do not use fixed content heights for localized text. Test 200% text zoom and long names/locations. Urdu requires `dir="rtl"` at document/app boundary; spacing, chevrons, grids and animation direction must use logical properties or RTL variants. Numeric prices keep locale-appropriate formatting.

## 6.3 Accessibility baseline (WCAG 2.2 AA target)

- One descriptive `h1`; subsequent heading levels follow structure.
- Landmarks: header/nav/main/aside/footer and named navigation regions.
- Every icon-only control has an accessible name; decorative icons/images use empty alt or `aria-hidden`.
- Inputs have persistent labels, purpose-appropriate autocomplete, textual errors, and error-summary focus on failed submission.
- Keyboard focus is visible with violet ring and sufficient offset. Drawers/modals trap focus, support Escape, restore trigger focus, and prevent background interaction.
- Current/pressed/expanded states use `aria-current`, `aria-pressed`, or `aria-expanded` appropriately.
- Critical touch targets target at least 44×44px or equivalent spacing; mobile bottom actions account for safe-area insets.
- Live updates (message sent, saved, upload progress) use restrained ARIA live regions; do not announce typing animation continuously.
- Charts include text/table summaries. Skeletons are hidden from assistive tech; loading container has a status label.
- Contrast: normal text 4.5:1, large text 3:1, controls/focus 3:1. Gold gets dark text.
- Honor reduced motion, high zoom, forced colors where practical, and never require drag-only interaction for media reordering.

Manual release tests: keyboard-only journey, VoiceOver/TalkBack or NVDA smoke test, 200% zoom, reduced motion, and automated axe/Lighthouse checks. Automated tools do not replace manual review.

## 6.4 SEO foundation

### URL and index policy

Category/listing/seller/help URLs are descriptive but retain stable IDs where identity matters. Redirect changed slugs with 301. Active public listings are indexable; drafts, expired private details, auth, dashboards, internal search combinations, and admin are `noindex`.

### Per-page metadata

- Unique title/description/canonical.
- Open Graph/Twitter image with QAVLIO branding, valid listing image/price/location where allowed.
- Hreflang for English/Urdu equivalents after localized URLs/content exist.
- Dynamic robots decisions based on listing state.

Phase 1 includes base title, description, OG type, theme color and `robots.txt`. Runtime title updates are implemented. Production listing metadata should be server-rendered or pre-rendered because client-only metadata is weaker for crawlers and social unfurls.

### Structured data

Use validated JSON-LD where factual:

- `Organization` / `WebSite` + `SearchAction` on home.
- `BreadcrumbList` on category/listing/help.
- `Product` + `Offer` or suitable vehicle/real-estate types on a listing; mark `itemCondition`, price/currency, availability accurately.
- Aggregate ratings only from eligible published reviews; never invent review counts.
- `FAQPage` only when the visible page contains qualifying authored Q&A.

Generate XML sitemap indexes for categories, active listings, public sellers and help content. Split at platform limits and use accurate `lastmod`. Expired content either redirects to a relevant category or remains a useful expired page temporarily—do not return soft 404s.

## 6.5 Performance budgets and tactics

| Metric | Target (mobile p75) |
|---|---|
| LCP | ≤2.5s |
| INP | ≤200ms |
| CLS | ≤0.1 |
| Initial route JS gzip | aspirational ≤170KB, monitor by route |
| Hero media | ≤250KB optimized; responsive AVIF/WebP |
| API public read p95 | ≤400ms excluding cold/third-party |

Tactics:

- Route-level lazy loading is enabled.
- Images declare aspect ratio/size, use object-fit and lazy loading below fold; CDN will negotiate format/width.
- Keep category/config cacheable with ETag and stale-while-revalidate after persistence.
- Debounce search suggestions, cancel stale requests, paginate results, and virtualize only when measured.
- Do not put payment/chat/admin dependencies in the public-home bundle.
- Preconnect only to required origins; self-host fonts before production if privacy/performance review favors it.
- Ads/analytics/AI load asynchronously and cannot block marketplace content.
- Track bundle sizes and Web Vitals in CI/production; establish regression thresholds after baseline measurements.

## 6.6 Resilience

Public browsing should continue if ads, AI, notifications, analytics, or realtime are unavailable. Show retryable local errors and preserve draft input. Use timeouts, abort signals, bounded retries with jitter only for safe operations, and circuit-breaker behavior for unstable providers. Payment and listing submission retries require idempotency.
