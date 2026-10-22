# Daybreak

A personal newspaper, built as a Next.js reading room with a FastAPI service, Supabase Auth/PostgreSQL, and an independent database-backed worker.

**Status: local development release.** The historical sample works without credentials. Real accounts, saved editions, AI summaries, scheduled generation, and email require configuration. This repository has not been deployed or verified against a live Supabase project. See [release status](docs/STATUS.md) for implementation boundaries and checks.

## Run the reading room

Requires Node.js 22 and Python 3.12.

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The sample uses a dated NASA story and evergreen source links, not invented current news. Read, flip pages, save sample bookmarks on this browser, navigate sections, and print to PDF without an account.

## Connect accounts and private data

1. Create a Supabase project. Run `backend/migrations/001_initial.sql`, `002_transactions.sql`, `003_request_limits.sql`, and `004_reading_progress.sql`, in order, in its SQL editor. Existing installations only need the new `004` migration.
2. In Supabase Auth, enable email/password, email confirmation, and configure SMTP before production. Set the Site URL and redirect allowlist to the exact frontend origin (locally `http://127.0.0.1:3000`). Password reset returns to this origin.
3. Copy `frontend/.env.example` to `frontend/.env.local`, and `backend/.env.example` to `backend/.env`. Fill in your project URL and public anon key in both. Put the **service-role key only in backend/.env**. Never add a `NEXT_PUBLIC_` prefix to a secret.
4. Restart the frontend after changing its environment.

Optional Google sign-in: configure the Google provider in Supabase Auth, then set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`. The Google button is hidden unless explicitly enabled. This flow requires live provider verification.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-lock.txt
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a separate terminal, from `backend`:

```powershell
.venv\Scripts\python -m app.worker
```

Register, verify your email, sign in, choose interests, add an accessible feed or public GitHub repository, and generate an edition. Jobs persist in PostgreSQL even if the browser closes. The worker must remain running. The API exposes `/health` and `/docs`.

## Providers

- **RSS/Atom:** public HTTPS feeds, validated before saving, capped at 2 MB. DNS addresses are checked and pinned for the fetch, including redirects. No arbitrary HTML scraping or paywall bypass.
- **GitHub:** public repository releases. `GITHUB_TOKEN` is optional for a higher API allowance. Do not use a token granting access to private repositories: this release does not implement per-user GitHub OAuth.
- **YouTube:** set a server `YOUTUBE_API_KEY`. Enter a channel ID beginning `UC`; the adapter reads official video metadata. Descriptions are not video transcripts.
- **Reddit:** requires approved API access and `REDDIT_ACCESS_TOKEN`. Enter a subreddit name without `r/`. Token refresh is an operator responsibility in this release.
- **AI:** configure `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` for a provider implementing the OpenAI-compatible chat-completions JSON interface. The model receives source title/excerpt and tone, not account details. Without AI, the engine uses labeled source excerpts. Model failure retries are bounded and fall back to excerpts. Links and original headlines are never model-generated.
- **Email:** configure `RESEND_API_KEY` and a verified `EMAIL_FROM`. Select link, PDF, or both in Settings. The worker records provider acceptance and subsequently retrieves delivery status. The receiving reader must sign in to access an edition link. No public sharing of private editions.

Email retries reuse an edition-specific idempotency key. Ambiguous sends older than 23 hours are marked failed instead of retried beyond the provider's idempotency window. Email notification permission is off by default. Disable it in Settings.

## Reading-room features

- Choose Light, Dark, or System from the top bar or reader toolbar; the choice is saved on this browser.
- Open **Explore stories** for full-text filtering of loaded stories, topic filters, newest-first sorting, and saved-only browsing.
- Sample bookmarks persist on this browser. Account bookmarks remain in Supabase.
- The reader has an independent scroll area between its toolbar and page controls. Scroll over the paper to reach the lower content; turn with arrows or drag the page corners. Touch gestures inside story text scroll vertically.
- Signed-in editions synchronize reading position separately for phone and desktop spreads, with device-local fallback when the API is unavailable. Apply migration `004` before using cloud progress.
- The archive can load older editions beyond the initial 100. Search and Explore filter the loaded collection.
- Settings shows an explicit backend/database readiness check. AI/email statuses indicate configuration, not proof of successful delivery.

For validation while another dev server runs, use `DAYBREAK_BUILD_DIR=.next-check`; ordinary commands continue to use `.next`.

## Verification commands

From the repository root, `node backend/tests/database.mjs` executes all migrations in embedded PostgreSQL and verifies RLS, transactional publishing/scheduling, rate limits, and deletion cascades. This validates the SQL locally but does not replace testing your actual Supabase project.

The opt-in `python -m tests.live_sources` command, run from `backend`, performs read-only network checks against NASA RSS and public GitHub releases. It is separate from offline unit tests.

```powershell
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

```powershell
cd backend
.venv\Scripts\python -m ruff check app tests
.venv\Scripts\python -m ruff format --check app tests
.venv\Scripts\python -m pytest -q
```

On this Windows environment, the default `python` command is an unavailable Windows Store alias. The local virtual environment was created using the bundled Python runtime; `.venv\Scripts\python.exe` works. Windows test runners need loopback socket and temporary-directory access; restrictive sandboxes may require running tests outside the sandbox.

## Deployment

See [deployment and architecture](docs/ARCHITECTURE.md). Do not deploy this release as production-ready until the live multi-user and provider checks in [release status](docs/STATUS.md) are completed.

## Offline reading

Choose **Save offline** in the reader and supply a passphrase of at least 12 characters. This explicitly saves an AES-GCM encrypted copy on this browser/device, using PBKDF2-SHA256 with 600,000 iterations. The passphrase is never sent or saved. Visit `/offline.html` to unlock the copy without a connection. Losing the passphrase means the saved copy cannot be recovered; the online edition remains in your account. Downloaded PDFs are a separate, unencrypted file on your device.

The service worker has to install successfully while online before offline navigation works. On an application update, close other Daybreak tabs and reopen to activate the new cache version. Private API responses and authentication are never cached.

The marketing introduction with a working reader is at `/welcome`; the main reading room is `/`.

## Credits

Sample image: NASA, ESA, CSA, and STScI, Webb Cosmic Cliffs. Source link and date are shown in the newspaper. Typography: Libre Caslon Display, Playfair Display, DM Sans via Google Fonts (system serif/sans fallback). Icons: Lucide. Page folding: StPageFlip `page-flip` 2.0.7, MIT. The small library is isolated behind a typed adapter; it is older, so mobile/React compatibility was verified locally rather than assuming active maintenance.
