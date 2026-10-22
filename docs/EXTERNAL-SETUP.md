# External setup checklist

The sample reading room works without accounts. The steps below enable private editions and delivery. Never paste secret keys into chat or commit environment files.

## 1. Supabase: required for accounts and saved editions

- Create a Supabase project and save its project URL, public anon key, and server service-role key.
- Run all four SQL files in `backend/migrations` in numerical order (001 through 004) using the project's SQL editor. If 001–003 are already applied, apply only 004.
- Enable email/password authentication and email confirmation. Set the Site URL and allowed redirects to `http://127.0.0.1:3000` for local development. Configure production SMTP for authentication emails.
- Copy `frontend/.env.example` to `frontend/.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
- Copy `backend/.env.example` to `backend/.env`. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_URL=http://127.0.0.1:3000`.
- The service-role key belongs only in the backend. It must never have a NEXT_PUBLIC prefix.

## 2. AI summaries: optional

Create an account with an API provider supporting the implemented chat-completions interface. Enable API billing as needed. Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in backend/.env to that provider's values. Without these, the app uses source excerpts. A chat subscription does not configure the application API.

## 3. Email delivery: optional

Create a Resend account, add a domain you control, and add its required DNS records at your domain provider. After domain verification, create an API key. Set `RESEND_API_KEY` and `EMAIL_FROM` in backend/.env. Enable delivery and choose time/timezone in Daybreak Settings. Supabase authentication email and newspaper delivery are separate configurations.

## 4. News sources and real media

Public HTTPS RSS/Atom feeds and public GitHub releases can be used without paid news API accounts. Feed images are used only when supplied by the publisher; not every feed includes photos. The application does not fabricate images or video. A photograph animation is not a video clip. The bundled historical sample includes credited NASA media.

Optional integrations:
- GitHub: `GITHUB_TOKEN` for higher public API limits; avoid private repository access.
- YouTube: enable YouTube Data API for your project and set `YOUTUBE_API_KEY`.
- Reddit: obtain approved API access and set `REDDIT_ACCESS_TOKEN`; renewal is currently manual.
- Google login: configure the Google OAuth provider in Supabase and then set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` in the frontend.

## 5. Run all three processes

Requires Node.js 22 and Python 3.12. Open three terminals. Run commands from the project directory.

Frontend:
```powershell
cd "H:\Daily newspaper proj\frontend"
npm ci
npm run dev
```

API:
```powershell
cd "H:\Daily newspaper proj\backend"
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-lock.txt
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Worker, after the backend environment is installed:
```powershell
cd "H:\Daily newspaper proj\backend"
.venv\Scripts\python -m app.worker
```

Open http://127.0.0.1:3000. Restart processes after editing environment values. Leave the worker running for generation and scheduling.

## 6. Verify before deployment

- Settings → Check status should report the database connected.
- Register, confirm email, log in, connect a source, and create an edition.
- Confirm the edition survives reload and appears in Archive; bookmark a story and resume its reader.
- If AI is configured, check the output against the linked source. If delivery is enabled, verify receipt in your mailbox rather than relying only on configured status.
- Inspect API documentation at http://127.0.0.1:8000/docs.

## 7. Deploy when ready

Host the Next.js frontend, the FastAPI service, and a continuously running worker. Use HTTPS. Configure environment secrets on each host. Update NEXT_PUBLIC_API_URL, FRONTEND_URL, and Supabase's Site URL/redirects to production origins; rebuild the frontend. Arrange logs, backups, uptime monitoring, and provider spending limits. This project has not yet been verified against your live providers or deployed for production.
