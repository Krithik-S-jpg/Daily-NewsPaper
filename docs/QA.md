# Local verification record — October 21, 2026

## Automated

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed |
| Prettier formatting | Applied |
| Frontend Vitest | 7 tests passed |
| Python pytest | 27 tests passed |
| Python Ruff check and format check | Passed |
| PostgreSQL migration/transaction/RLS harness | Passed |
| Next.js production build | Passed |
| npm audit, full tree and runtime tree | 0 vulnerabilities reported |

The PostgreSQL harness executes the actual migration files in PGlite, with local stand-ins for Supabase's auth schema/roles. It checks owner isolation, denied direct writes and RPC calls, normalized preference persistence, leased job claims, duplicate publishing/scheduling, request budgets, and account-deletion cascades. It does not validate Supabase infrastructure or production concurrency.

Unit tests cover source normalization and attribution, URL deduplication, ranking, malformed AI output, timezone/DST schedules, unsafe URL/DNS rejection, unauthorized requests and foreign-user access, long PDF content, worker retries, published-edition reuse, duplicate-send prevention, mocked attachment delivery, provider-confirmed delivery, responsive pagination, long-text preservation, and offline encryption/password rejection.

## Live public-source smoke test

NASA RSS returned 10 valid attributed items. GitHub's public Next.js releases endpoint returned 20. The extractive pipeline composed 12 stories and retained an original URL for each. This was a read-only test, without AI, Supabase persistence, or email sending. These item counts describe this test run only.

## Visual and interactive review

- Desktop reading room and two-page newspaper spread inspected in the browser.
- Phone viewport at 390 px tested. A clipping issue was found and corrected with single-story pages and continuation pagination; visible page content no longer exceeded its page height in the tested sample.
- Page navigation, semantic mode, reader close/reopen, and bookmarks exercised. Bookmark actions were checked in the active reader and the saved story appeared in the Bookmarks section.
- Unconfigured sign-in explicitly explains setup and disables submission. No simulated authentication.
- Two-column A4 PDF fixture rendered with Poppler and visually inspected for text wrapping, margins, attribution, page numbering, and overflow.

## Verification limits

Live Supabase login/reset/OAuth, actual SMTP, AI provider output quality, Resend delivery, YouTube/Reddit access, production scheduler uptime, real-device PWA installation, and offline-service-worker lifecycle need configured services and target-device testing. None is reported as externally verified.

Two non-failing tooling notices remain: Next.js notes that its optional ESLint plugin is absent (the vulnerable preset dependency chain was replaced with TypeScript ESLint); Starlette warns that its test-client httpx adapter is deprecated. Both test/build commands finish successfully.
# October 22: illustrated motion edition

- Added a shared media preview component, including delegated handlers for cloned flipbook pages; hover, tap, and keyboard activation; muted/lazy video; failure fallback; 12-second playback limit; page-turn/tab-hide cleanup; reduced-motion behavior.
- Added three local media assets (NASA comparison video, infrared image, Earth composite); credits are in `MEDIA.md`. AI artwork was subsequently removed at the user's request.
- Seven existing frontend regression tests passed. The production build, type checks, and lint passed after the interaction implementation.
- Visual/playback verification of this revision is **not completed**: browser security review refused access to the existing preview tab because it resolved to a disallowed protocol. No alternate browser route was used. Mobile/desktop styling and actual hover/touch playback still require a live manual check.

## October 22: reading-room and workspace upgrade

- Added persisted light/dark/system themes, searchable story explorer, topic and saved filters, edition statistics, persistent sample bookmarks, service readiness UI, archive pagination, and authenticated reading-progress synchronization.
- Fixed reader overflow with a separately scrollable paper area. On the isolated HTTP production preview at 1366 x 768, keyboard End reached the full 441-pixel scroll range and remained there across observations; paper footer and navigation were both accessible.
- Browser search reduced six sample stories to the matching planet story. Saving it, reloading, and opening Bookmarks retained the story. Dark theme also survived reload.
- Backend: 38 tests passed; frontend: 7 tests passed; Ruff, TypeScript, ESLint, production build, and embedded PostgreSQL migration/RLS checks passed. Progress tests include owner isolation, input bounds, composite foreign-key enforcement, and deletion cascades.
- Live provider verification remains pending the account configuration described above. Desktop browser verification does not establish real-device touch support.


## Magazine cover redesign

Added a photographic edition cover, reading index, compact edition statistics, image-first explorer cards, and simplified preview controls. Existing credited source media is reused; no generated imagery was added. Video restarts from the beginning on activation.

Production build (including type/lint validation) passed. Frontend regression suite: 7 passed. Browser verified the cover video playing (readyState 4 and advancing currentTime), Open edition opening the reader, and no horizontal page overflow at a 390-pixel viewport. External accounts remain unconfigured; see EXTERNAL-SETUP.md.
