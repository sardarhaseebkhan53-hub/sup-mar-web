# 5. DealHub UI Design System

## 5.1 Reference interpretation

The supplied Phase 1 image establishes: a crisp white marketplace canvas; deep navy framing; violet primary actions and emphasis; gold DealHub tag/logo and Sell action; a large “Find Anything. Sell Everything.” hero; icon-led category navigation; compact, image-forward listing cards; and a purpose-built mobile bottom navigation.

The implementation keeps those cues but improves consistency by using a quieter dotted hero field, fewer competing gradients, stronger card spacing, reusable status badges, responsive dashboard shells, visible focus states, and real local listing assets. It is a design direction, not a pixel reproduction and not an OLX clone.

## 5.2 Brand

- **Name:** DealHub
- **Tagline:** Buy. Sell. Discover.
- **Promise:** Great local value with clearer trust and a more polished experience.
- **Voice:** direct, helpful, optimistic, safety-aware; never alarmist or overly playful.
- **Logo:** gold price-tag/check mark plus DealHub wordmark. Keep the shape, proportions, name, and tagline consistent across public, auth, dashboard, loading, error, footer, notification, and future email surfaces.

### Logo rules

- Clear space: at least one-half mark width on all sides.
- Minimum mark: 28px digital; full signature: 120px wide.
- Use full signature in primary headers/auth/footer; compact mark + name where space is constrained.
- On dark navy use white wordmark and original gold mark. Do not recolor the mark violet, add effects, rotate it, or create panel-specific variants.
- Future email/notification templates import the same approved hosted SVG/PNG assets.

## 5.3 Color tokens

| Token | Value | Use |
|---|---:|---|
| `ink-950` | `#080719` | Dark brand canvas/footer |
| `ink-900` | `#10102A` | Main headings/navy surfaces |
| `ink-800` | `#1B1B3A` | Secondary dark text |
| `violet-600` | `#6C22D7` | Primary button/link/current state |
| `violet-500` | `#8338EC` | Focus and brand glow |
| `violet-100` | `#EEE6FF` | Selected/subtle interactive surface |
| `gold-300` | `#FFD33D` | Sell CTA, featured emphasis |
| `gold-500` | `#F5AE00` | Accent text/icons on light surfaces |
| `surface` | `#F7F7FB` | App background |
| white | `#FFFFFF` | Cards and high-contrast text |
| emerald | Tailwind 50–700 | Verified/success |
| rose/red | Tailwind 50–700 | Favorite, destructive, risk |

Gold buttons always use navy text; gold is not used as body text on white below contrast requirements. Violet buttons use white text. Status must also have an icon/label—not color alone.

## 5.4 Typography

- **Primary:** Manrope, weights 400/500/600/700/800; system fallback.
- **Display:** 41–57px desktop hero, 41px mobile; 1.03 line height; −3.5% tracking.
- **Page title:** 30–36px; section title 24–30px; card title 14px; body 14–16px; metadata 10–12px.
- Uppercase eyebrow text is short, weight 800, and tracked 0.16em. Avoid uppercase paragraphs.
- Prices are bold, tabular-feeling, and visually above listing titles; currency is always explicit.

## 5.5 Spacing and layout

Use a 4px base: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64`.

- Content shell: max 1440px; 16px mobile, 24px tablet, 32px desktop gutters.
- Public header: 68px mobile/76px desktop plus mobile search row.
- Cards: 16–20px internal space; panels 20–28px; sections 48–64px.
- Radius: 8px controls, 12px buttons/inputs, 20px cards, 28px hero/feature panels.
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
- User images are re-encoded, responsive, lazy-loaded below fold, and accompanied by useful alt text.
- Generated Phase 1 preview assets depict car, phone, motorcycle, sofa, camera, and apartment listings consistently; production media comes from the upload/CDN pipeline.
- Badges and favorite controls sit in protected high-contrast surfaces, never directly as unreadable text over an image.

## 5.8 Motion

Use 150–300ms transitions for color, shadow, small translate and image zoom. The hero image drifts very subtly. Avoid autoplay carousels, parallax, scroll hijacking, or gratuitous looping. `prefers-reduced-motion` removes animation and smooth scrolling.

## 5.9 Writing patterns

- Action labels: “Post a listing”, “Chat with seller”, “Apply filters”; avoid vague “Submit”.
- Empty states explain why and provide one next action.
- Fees display currency, duration, tax status, refund/cancellation rule, and exact entitlement before confirmation.
- Safety guidance is concise and contextual; never imply DealHub guarantees an off-platform exchange.
- “Featured” and “Sponsored” are disclosed; verification wording states what was verified.

## 5.10 Design release checklist

Brand asset unchanged; hierarchy clear at 360/768/1024/1440; text contrast AA; keyboard/focus works; labels/errors are announced; no status by color alone; touch targets practical; images reserve size; loading/empty/error states exist; overflow tested with long Urdu/English content; prices and promotions are server-configured; sponsored placement is labeled.
