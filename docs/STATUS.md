# Release status

## Implemented

- Responsive editorial reading room and `/welcome` introduction with a working reader, navigation, sample edition, realistic folded page turns, keyboard/mouse/touch support from StPageFlip, thumbnail table of contents, saved reading position, private-link copying, text-size/semantic fallback, fullscreen, bookmarks, archive search, source management, discovery, settings, onboarding, account deletion.
- Supabase email/password registration, verification, login, reset/recovery, session persistence and logout. All private backend endpoints validate the session and ownership. Unconfigured auth is visibly disabled, never simulated.
- SQL schema, indexes, RLS read policies and server-only transactional queue/publishing/preference functions.
- RSS/Atom, GitHub-release, YouTube-metadata and Reddit-community adapters; source validation, canonicalization, deduplication, ranking, grounded summaries with extractive fallback.
- Independent PostgreSQL-backed generation worker, scheduler with timezone/DST handling, retry limits, lease renewal, stable edition identity, manual-generation throttling, and persistent source/PDF request budgets.
- A4 two-column server PDF with linked attribution and page numbers, browser print layout for the historical sample, PDF/link email formats, idempotent send key, provider delivery reconciliation.
- Manifest/icons, public-asset service worker caching, encrypted offline saved-edition library, and downloaded PDFs. Offline copies require a local passphrase and are never saved automatically.

## Locally verified

The frontend production build, TypeScript check, ESLint, unit tests and backend pytest/Ruff checks are run during implementation. Test results are reported in the handoff. Browser checks cover desktop and phone layouts, reader navigation, semantic mode, bookmark actions, and honest unconfigured authentication. The PDF fixture is rendered and visually inspected. The npm audit is checked after dependency changes. Embedded PostgreSQL successfully executes the migrations and verifies RLS/transaction behavior. Live read-only NASA and GitHub checks retrieved 10 and 20 items respectively and composed 12 attributed source-excerpt stories. No AI was used in that smoke test.

## Requires external configuration and verification

Supabase migrations/RLS against a real database; two separate real users proving isolation; SMTP/verification/reset emails; production AI outputs; YouTube/Reddit quota and access; Resend delivery and attachments; worker restarts and lease contention against Postgres; HTTPS PWA installation; actual hosting deployment. The user has not yet created these services and requested setup documentation.

## Remaining scope before the full brief is production-ready

- URL-based protected app routing (the current entry is the functioning public reading room; private data is authorized by the backend).
- Live Google OAuth verification (the gated button/integration is implemented), per-user OAuth for private GitHub/Reddit, organization/commit/PR/issue tracking, richer source search, and provider token refresh.
- Image-density/opinion preferences and notifications. Light/dark/system themes and incremental archive loading are now implemented.
- Article-page image discovery beyond publisher RSS attachments, and richer PDF image layouts. RSS article images and their supplied credits now survive collection, composition, and storage. No stock or generated image substitutes are used.
- Semantic related-story clustering, multi-source claim synthesis, editorial factuality evaluations, and administrator monitoring.
- Edge request limits, automatic content retention, real multi-process database concurrency tests and deployment smoke tests.

No production deployment, email delivery, live authentication, or AI-provider success is claimed. This is a working development foundation with integrations to configure, not the completed initial production release in the full brief.

### Illustrated reader supplement (October 22)
The browser reader interleaves original text fiction, a three-part puzzle corner with revealable answers, and a creative slow-reading page. Generated artwork was removed at the user's request. These fixed editorial extras are separate from sourced news and are available in flip and semantic modes. They are not included in server-generated PDFs or encrypted offline exports.

### Reading-room upgrade

The reader has a dedicated vertical scroll viewport, persistent light/dark/system themes, a searchable story explorer, topic and saved-only filters, persistent local sample bookmarks, dashboard edition counts, API/database readiness UI, and archive pagination. Migration `004_reading_progress.sql` adds owner-isolated account reading positions. API tests and embedded PostgreSQL verify the new ownership rules; a configured live Supabase project is still required for external verification.
