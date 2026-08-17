# 5. QAVLIO UI Design System

## 5.1 Original direction

QAVLIO uses a crisp white marketplace canvas, deep midnight framing, violet primary actions, gold discovery accents, the “Find What Matters. Sell What You Don't.” hero, icon-led taxonomy, compact image-forward cards, and purpose-built mobile navigation.

The system is original to QAVLIO. It uses a quiet discovery grid, controlled gradients, clear card rhythm, reusable status badges, responsive dashboard shells, and visible focus states. It must not reproduce another marketplace's logo, palette, copy, layout, illustrations, iconography, or proprietary interaction patterns.

## 5.2 Brand

- **Name:** QAVLIO
- **Tagline:** Buy. Sell. Discover.
- **Promise:** Great local value with clearer trust and a more polished experience.
- **Voice:** direct, helpful, optimistic, safety-aware; never alarmist or overly playful.
- **Logo:** a rounded violet Q/orbit mark plus the QAVLIO wordmark. The orbit represents discovery, connected nodes represent people and listings, the central spark represents a find, and the gold tail represents movement.

### Logo suite and rules

- `qavlio-mark.svg`: primary interface mark.
- `qavlio-app-icon.svg`: square app/store icon master.
- `qavlio-logo.svg`: dark-on-light signature.
- `qavlio-logo-light.svg`: signature for midnight surfaces.
- `qavlio-mark-mono.svg` and `qavlio-logo-mono.svg`: one-color production/print fallbacks.
- `public/favicon.svg`: browser icon.
- Clear space: at least one-half mark width on all sides. Minimum mark: 28px digital; full signature: 120px wide.
- Use the full signature in primary brand moments and mark + live wordmark in responsive product navigation.
- Do not distort, rotate, add effects, change node positions, or create page-specific variants.
- Future app, email, social, and notification exports derive from the same approved vector masters.

## 5.3 Color tokens

| Token | Value | Use |
|---|---:|---|
| `ink-950` | `#080C1C` | Dark brand canvas/footer |
| `ink-900` | `#0F162B` | Main headings/midnight surfaces |
| `ink-800` | `#1D253E` | Secondary dark text |
| `primary` / `violet-600` | `#6746D9` | Primary button/link/current state |
| `primary-hover` / `violet-700` | `#5230BE` | Primary hover/pressed direction |
| `violet-500` | `#7B53E7` | Focus, logo, and brand emphasis |
| `violet-100` | `#EFEAFF` | Selected/subtle interactive surface |
| `secondary` | `#10909C` | Supporting discovery/status accent |
| `accent` / `gold-300` | `#F6BC36` | Sell CTA, featured emphasis |
| `gold-500` | `#C47E0C` | Accent text/icons on light surfaces |
| `background` / `surface` | `#F7F8FC` | App background |
| `surface-elevated` | `#FFFFFF` | Cards, menus, modal surfaces |
| `success` | `#12855A` | Verified/success |
| `warning` | `#C2740D` | Caution/attention |
| `error` | `#CC3545` | Destructive/error |
| `info` | `#2563EB` | Informational feedback |

Gold buttons always use navy text; gold is not used as body text on white below contrast requirements. Violet buttons use white text. Status must also have an icon/label—not color alone.

## 5.4 Typography

- **Primary:** Manrope, weights 400/500/600/700/800; system fallback.
- **Display:** 41–57px desktop hero, 41px mobile; 1.03 line height; −3.5% tracking.
- **Page title:** 30–36px; section title 24–30px; card title 14px; body 14–16px; metadata 10–12px.
- Uppercase eyebrow text is short, weight 800, and tracked 0.16em. Avoid uppercase paragraphs.
- Prices are bold, tabular-feeling, and visually above listing titles; currency is always explicit.

## 5.5 Spacing and layout

Use a 4px base: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`.

- Content shell: max 1440px; 16px mobile, 24px tablet, 32px desktop gutters.
- Public header: 66px mobile/76px desktop plus mobile search row.
- Cards: 16–20px internal space; panels 20–28px; sections 48–80px.
- Radius tokens: 10px small controls, 14px medium cards, 18px large panels, 24px XL hero/feature surfaces, and full pills.
- Shadow tokens: `shadow-sm`, `shadow-card`, `shadow-lg`, and `shadow-floating`; floating is reserved for drawers, dialogs, and the hero collage.
- Border: navy at 10–15% opacity. Shadows remain subtle; reserve floating shadow for hero imagery or critical panels.

## 5.6 Core components

| Component | Variants / states |
|---|---|
| Button | primary violet, secondary outline, Sell gold, ghost, danger; default/hover/focus/disabled/loading |
| Field | text, search, select, textarea, price, OTP; label/help/error/success/disabled |
| Logo | full, compact, inverse |
| Category card/icon | data-driven icon/accent, hover/current/disabled |
| Listing card | standard/horizontal; featured, verified, condition, favorite; loading/empty |
| Badge | featured, verified, violet informational, neutral, warning/error |
| Ad slot | banner/rectangle/mobile; loading, empty house-ad, campaign, failed |
| Header | desktop search-led, mobile drawer + dedicated search |
| Dashboard shell | customer/seller/admin configuration with shared brand/layout |
| Feedback | toast, inline alert, modal, empty state, skeleton, error/retry |

One primary action per decision group. Secondary actions use outline/ghost treatment. Destructive actions are separated and require confirmation where effects cannot be trivially undone.

## 5.7 Listing imagery

- Search cards use 4:3; detail gallery uses 16:9/16:10 with reserved dimensions to prevent layout shift.
- Phase 1 assets provide 480px and 960px WebP `srcset` derivatives. Production user images are re-encoded into responsive variants, lazy-loaded below fold, and accompanied by useful alt text.
- QAVLIO-owned/generated Phase 1 preview assets depict a car, phone, motorcycle, sofa, gaming laptop, smart television, mountain bike, camera, and apartment consistently; production media comes from the upload/CDN pipeline.
- Badges and favorite controls sit in protected high-contrast surfaces, never directly as unreadable text over an image.

## 5.8 Motion

Use 150–300ms transitions for color, shadow, small translate and image zoom. The hero image drifts very subtly. Avoid autoplay carousels, parallax, scroll hijacking, or gratuitous looping. `prefers-reduced-motion` removes animation and smooth scrolling.

## 5.9 Writing patterns

- Action labels: “Post a listing”, “Chat with seller”, “Apply filters”; avoid vague “Submit”.
- Empty states explain why and provide one next action.
- Fees display currency, duration, tax status, refund/cancellation rule, and exact entitlement before confirmation.
- Safety guidance is concise and contextual; never imply QAVLIO guarantees an off-platform exchange.
- “Featured” and “Sponsored” are disclosed; verification wording states what was verified.

## 5.10 Design release checklist

Brand asset unchanged; hierarchy clear at 360/768/1024/1440; text contrast AA; keyboard/focus works; labels/errors are announced; no status by color alone; touch targets practical; images reserve size; loading/empty/error states exist; overflow tested with long Urdu/English content; prices and promotions are server-configured; sponsored placement is labeled.
