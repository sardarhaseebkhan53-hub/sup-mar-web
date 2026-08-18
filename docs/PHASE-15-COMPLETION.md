# Phase 15 — Trust, Safety, Verification, and Anti-Fraud

QAVLIO now has an end-to-end, human-in-the-loop trust and safety system on top of the Phase 11 foundation and Phase 14 command center.

## Verification

- Seller-controlled profile submission with backend-owned status, reviewer, review date, and expiry
- Pending, Under Review, Verified, Rejected, Needs More Information, and Expired states
- Privacy-scoped admin verification queue and audit integration
- Verified Seller badges only when an active approved `SellerVerification` exists
- Private `VerificationDocument` architecture stores opaque private references; raw references are excluded from all seller/public/admin queue presenters
- Verification document intake fails closed until a private storage and malware-scanning provider is configured

## Risk and moderation

- Internal 0–100 risk scoring with Low, Medium, High, and Critical levels
- Conservative signals for duplicate content/images, repetitive descriptions, spam, links, unsafe payment language, unusual prices, rapid listing creation, reports, failed payments, and confirmed violations
- Public APIs never return scores, private rules, AI logs, or internal notes
- Pre-publication moderation pipeline combines automatic checks, configurable category rules, internal assessment, and human review
- High/Critical or review/block-rule listings enter Pending Review instead of being accused or permanently removed automatically
- AI moderation logs store provider/model, assessment, signals, and result—never prompts—and AI cannot ban users

## Reports, blocks, restrictions, and appeals

- Unified report API plus listing/seller/review-specific workflows
- Expanded report reasons, reason-aware duplicate prevention, per-target open-report caps, and route rate limits
- User and seller blocking, messaging enforcement, blocked-user management, hidden listing management, and blocked content filtering in search
- Optional report-and-block interface
- Listing, Messaging, Account, and Selling restrictions with start/end dates and safe automatic expiry
- Appeals with ownership checks, duplicate/new-information rules, private evidence references, history, and human resolution
- Accepted listing appeals return content to Pending Review rather than bypassing moderation

## Enforcement and administration

- Unified moderation queue for listings, users, reports, reviews, verification, risk alerts, and appeals
- Moderation actions, restrictions, violations, internal notes, and audit records are append-only
- Repeat-offender analytics use confirmed `ViolationHistory`, not reports alone
- Configurable moderation rules support FLAG, REVIEW, and narrowly scoped BLOCK actions
- Admin safety dashboard includes reports, risk, verification, suspended users, appeals, fraud signals, resolution rate, resolution time, repeated offenders, and report reasons

## Safety education

- Branded Safety Center for buying, selling, scams, payments, chat, reporting, account protection, and safe meetings
- Concise listing Safety Panel warns against prepayment, suspicious requests, password/OTP sharing, and unsupported payment flows
- OTP and reset secrets are now redacted from development logs

## Security boundary

Sellers cannot set verification or moderation fields. Customers cannot modify reports or appeals after submission. Normal users cannot invoke admin review actions. Support and Finance roles do not receive verification or internal risk access. Sensitive document storage references, risk rules, scores, AI moderation details, private evidence, and moderator notes never enter public listing or seller metadata.
