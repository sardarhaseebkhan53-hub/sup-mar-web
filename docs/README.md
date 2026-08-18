# QAVLIO Product & Architecture Documentation

This directory is the engineering and product source of truth. Start with the controlling Phase 0 blueprint, then use the domain plans for implementation detail.

1. [Phase 0 controlling blueprint](00-phase-0-blueprint.md)
2. [Requirements and scope](01-requirements.md)
3. [Information architecture, sitemap, and user flows](02-information-architecture.md)
4. [Database plan](03-database-plan.md)
5. [API, authentication, and security plan](04-api-auth-security.md)
6. [UI design system](05-design-system.md)
7. [Responsive, accessibility, SEO, and performance rules](06-responsive-accessibility-seo.md)
8. [Component and folder architecture](07-component-folder-architecture.md)
9. [Advertising, payments, promotions, analytics, and AI](08-platform-services.md)
10. [Low-fidelity wireframes](09-wireframes.md)
11. [Development workflow and Git/GitHub setup](10-development.md)
12. [Phase 0–13 delivery roadmap](11-roadmap.md)
13. [Phase 2 identity and account system](12-phase-2-identity.md)
14. [Phase 0 completion record](PHASE-0-COMPLETION.md)
15. [Phase 1 completion record](PHASE-1-COMPLETION.md)
16. [Phase 2 completion record](PHASE-2-COMPLETION.md)
17. [Phase 13 seller monetization completion record](PHASE-13-COMPLETION.md)

## Decision principles

- **Configuration over hard-coding:** taxonomy, prices, limits, currencies, promotion products, reward rules, and ad placements come from server APIs and versioned database settings.
- **API-first:** web and future mobile applications consume versioned REST contracts and authenticated real-time events.
- **Trust by design:** identity, moderation, reporting, auditability, privacy, safe-trading guidance, and commercial transparency are first-class.
- **Provider independence:** media, payment, delivery, email/SMS, and AI integrations stay behind server-side interfaces.
- **Progressive delivery:** no screen implies a completed transaction unless its backend workflow exists.
- **Accessible and responsive:** keyboard access, semantic markup, WCAG 2.2 AA contrast targets, reduced motion, and device-specific layouts are release gates.
- **No unnecessary rewrites and no Docker requirement:** extend stable modules and use Node/npm plus managed services.
