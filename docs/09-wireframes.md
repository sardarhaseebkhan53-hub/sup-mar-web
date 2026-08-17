# 9. Low-Fidelity Wireframes

These structure diagrams define hierarchy and responsive intent. The runnable Phase 1 frontend is the high-fidelity interactive foundation.

## 9.1 Homepage

```text
DESKTOP
┌──────────────────────────────────────────────────────────────────────────┐
│ QAVLIO  [Category | Search intent........ | Location]  EN Login Reg SELL│
├──────────────── category icon navigation ────────────────────────────────┤
│ ┌──────────────────────── HERO ────────────────────────────────────────┐ │
│ │ label  FIND ANYTHING.     marketplace image composition             │ │
│ │        SELL EVERYTHING.   car / phone / furniture + map motif       │ │
│ │ [Browse categories] [Sell item]                                     │ │
│ │ trust point · trust point · trust point                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ Popular categories                                      View all         │
│ [Car] [Bike] [Mobile] [Tech] [Home] [Chair] [Fashion] [More]            │
│ Featured listings                                       View all         │
│ [image/price/title/meta/seller] × 5                                      │
│ [configurable HOME_MIDDLE ad slot]                                       │
│ How it works: [Discover] [Connect safely] [Make a deal]                  │
└──────────────────────────────────────────────────────────────────────────┘

MOBILE
┌──────────────────────────┐
│ ☰  QAVLIO          bell │
│ [Search marketplace 🔍]  │
├──────────────────────────┤
│ FIND ANYTHING.           │
│ SELL EVERYTHING.         │
│ [Browse categories]      │
│ [Sell your item]         │
│ trust · trust · trust    │
├──────────────────────────┤
│ category chips/cards →   │
│ Featured listings →      │
│ [large card] [next…]     │
│ [MOBILE_HOME ad slot]    │
├──────────────────────────┤
│ Home Browse  (+) Chat Me │
└──────────────────────────┘
```

## 9.2 Category/search results

```text
┌ QAVLIO global search/navigation ────────────────────────────────────────┐
│ breadcrumb                                                               │
│ [category icon] Cars / query title                  result count          │
│ [CATEGORY_TOP ad slot]                                                   │
│                ┌ result/sort toolbar ─────────────────────────────────┐  │
│ ┌ FILTERS ──┐  │ [card] [card] [card]                                 │  │
│ │ location  │  │ [card] [card] [card]                                 │  │
│ │ price     │  │ cursor pagination / load more                         │  │
│ │ condition │  └───────────────────────────────────────────────────────┘  │
│ │ date      │                                                            │
│ └───────────┘                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Mobile replaces the left rail with a Filters disclosure/drawer, preserves sort and applied chips, and uses one/two-column cards without viewport overflow.

## 9.3 Listing details

```text
┌ breadcrumb / back ───────────────────────────────────────────────────────┐
│ ┌ image gallery + thumbnails ───────────┐ ┌ asking price ─────────────┐ │
│ │                                       │ │ PKR …                      │ │
│ └───────────────────────────────────────┘ │ [Chat] [Show phone]        │ │
│ ┌ title / location / date / ID ─────────┐ │ [Save] [Share]             │ │
│ │ description                           │ ├ seller identity/rating ────┤ │
│ │ structured attributes                 │ │ seller profile / safety    │ │
│ └───────────────────────────────────────┘ ├ LISTING_SIDEBAR ad ────────┤ │
│ [LISTING_BANNER ad]                       └ report ─────────────────────┘ │
│ You may also like [card] [card] [card] [card]                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Mobile stacks gallery → title/price → contact controls → seller/safety → description → related. Later phases may use a safe-area sticky contact bar after usability testing.

## 9.4 Post a listing

```text
┌ Back   SELL ON QAVLIO / Create a great listing            Draft saved ┐
│ [1 Category] [2 Details] [3 Photos] [4 Location] [5 Review]             │
│ ┌ form ─────────────────────────────────────┐ ┌ contextual help ──────┐ │
│ │ What are you selling?                    │ │ Photo checklist        │ │
│ │ [category grid]                          │ │ Fee/config explanation │ │
│ │ title                                    │ │ trust guidance         │ │
│ │ description / future AI writing help     │ └────────────────────────┘ │
│ │ price / condition / dynamic attributes   │                            │
│ │                 [Save draft] [Continue]  │                            │
│ └──────────────────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Mobile uses a horizontally scrollable progress rail, single-column fields, and stacked contextual help. Photos support keyboard buttons as well as future drag reorder.

## 9.5 Authentication

```text
DESKTOP
┌ navy brand/story panel ─────────────┬ centered form ────────────────────┐
│ QAVLIO                             │ Back home                         │
│ More trust. Better deals.           │ Log in / Create account           │
│ One community.                      │ [buyer / seller role intent]       │
│                                    │ labeled fields                    │
│ security/privacy reassurance        │ primary action                    │
│                                    │ OTP alternative / account switch │
└─────────────────────────────────────┴───────────────────────────────────┘
```

Mobile omits the story panel, retains logo/back, form labels, password visibility and comfortable action sizing. Authentication returns the user to the interrupted listing/contact/sell action.

## 9.6 Customer dashboard

```text
┌ branded role sidebar ─┬ top utilities/account ──────────────────────────┐
│ Overview              │ Welcome + [Find something]                      │
│ Saved listings        │ [saved] [messages] [searches] [alerts]          │
│ Saved searches        │ ┌ price drops/listing cards ─┐ ┌ AI future ──┐ │
│ Messages              │ │                            │ │              │ │
│ Payments              │ └────────────────────────────┘ ├ DASHBOARD ad┤ │
│ Settings / Help       │                                └──────────────┘ │
└───────────────────────┴────────────────────────────────────────────────┘
```

## 9.7 Seller dashboard

```text
┌ seller sidebar ───────┬ business overview                    [Post] ────┐
│ listings/inquiries    │ [active] [views] [inquiries] [conversion]       │
│ analytics/promotions  │ ┌ recent listing inventory table ────────────┐ │
│ store/payments        │ │ image / status / views / price / manage     │ │
│ reviews/settings      │ └─────────────────────────────────────────────┘ │
│                       │ ┌ weekly views chart ─────────────────────────┐ │
└───────────────────────┴─┴──────────────────────────────────────────────┴─┘
```

## 9.8 Admin dashboard

```text
┌ admin sidebar ────────┬ platform overview             systems healthy ┐
│ users                 │ [users] [listings] [pending] [revenue]         │
│ listings/moderation   │ ┌ moderation queue ─────────┐ ┌ growth chart ┐ │
│ revenue/analytics     │ │ priority/type/age/action  │ │              │ │
│ categories/ads        │ └───────────────────────────┘ └──────────────┘ │
│ settings/audit        │ deeper modules via scoped permissions          │
└───────────────────────┴────────────────────────────────────────────────┘
```

All dashboards switch to a compact branded header and horizontal task rail on mobile. Data tables scroll within a panel or become cards; the full page never scrolls horizontally.

## 9.9 Advertisement slots

```text
BANNER (desktop)              RECTANGLE (side rail)
┌ Advertisement ───────────┐  ┌ Advertisement ───────┐
│ approved creative    [→] │  │                      │
│ disclosure / alt         │  │ approved creative    │
└──────────────────────────┘  │ disclosure / CTA     │
                              └──────────────────────┘

EMPTY/LOADING: reserve intended size; use neutral skeleton or render nothing
HOUSE AD: QAVLIO-branded, clearly labeled, returned by slot service
MOBILE: separate mobile creative; never downscale unreadable desktop artwork
```

Every rendered wrapper exposes `data-ad-slot`, accessible label and registered ID for diagnostics. The Phase 1 preview shows a restrained house-style placeholder to make placement/configuration reviewable.

## 9.10 Messages

```text
DESKTOP: [search + conversation list] | [seller header / messages / composer]
MOBILE:  conversation list → selected conversation as separate state

Composer: attachment + labeled text input + send. Safety notice is contextual.
Future: delivery/read states, block/report, reconnect/missed-message recovery.
```
