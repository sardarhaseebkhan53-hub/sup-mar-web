# DealHub Phase 1 Documentation

This directory is the source of truth for the marketplace foundation.

1. [Requirements and scope](01-requirements.md)
2. [Information architecture, sitemap, and user flows](02-information-architecture.md)
3. [Database plan](03-database-plan.md)
4. [API, authentication, and security plan](04-api-auth-security.md)
5. [UI design system](05-design-system.md)
6. [Responsive, accessibility, SEO, and performance rules](06-responsive-accessibility-seo.md)
7. [Component and folder architecture](07-component-folder-architecture.md)
8. [Advertising, payments, promotions, analytics, and AI](08-platform-services.md)
9. [Low-fidelity wireframes](09-wireframes.md)
10. [Development workflow and Git/GitHub setup](10-development.md)
11. [Feature roadmap](11-roadmap.md)
12. [Phase 2 identity and account system](12-phase-2-identity.md)
13. [Phase 1 completion report](PHASE-1-COMPLETION.md)
14. [Phase 2 completion report](PHASE-2-COMPLETION.md)

## Decision principles

- **Configuration over hard-coding:** categories, prices, limits, currencies, promotions, and ad placements come from APIs.
- **API-first:** web and future mobile applications consume versioned REST contracts and authenticated real-time events.
- **Trust by design:** identity, moderation, reporting, auditability, privacy, and safe-trading guidance are first-class.
- **Progressive delivery:** Phase 1 wireframes may be interactive, but no screen implies a completed transaction unless its backend workflow exists.
- **Accessible and responsive:** keyboard access, semantic markup, contrast, reduced motion, and device-specific layouts are release gates.
- **No Docker:** local and early hosting workflows use Node/npm and managed low-cost services.
