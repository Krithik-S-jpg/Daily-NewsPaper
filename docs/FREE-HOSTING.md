# Free-tier worker deployment

Use Netlify for the website, Render Free Web Service for the API, and Supabase for the database. Do not create a paid Render Background Worker.

Upload `.github/workflows/daybreak-worker.yml`, `backend/app/batch_worker.py`, and the updated `backend/app/worker.py` to your GitHub repository's default branch, together with the rest of the backend.

In GitHub: repository Settings → Secrets and variables → Actions → New repository secret. Add SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and FRONTEND_URL. Values match the Render API environment. Keep the service-role key secret.

Open Actions → Daybreak queue worker → Run workflow. A successful empty-queue run confirms connectivity, not generation. Queue an edition from the website, run the workflow again, then reopen Archive after it completes.

The workflow runs at 00:17, 06:17, 12:17, and 18:17 UTC (05:47, 11:47, 17:47, and 23:47 India time), on the default branch. It attempts up to five jobs, with a four-minute processing budget and a ten-minute overall runner timeout. Interrupted jobs become eligible again after their database lease expires. GitHub can delay runs; exact delivery times are not guaranteed. Remaining jobs wait for another run. Manual dispatch is available at any time.

This conservative schedule reduces runner usage. Private repositories consume included Actions minutes; other workflows share the allowance. Keep paid overages disabled or configure a budget that stops usage at zero. Check account billing and usage; no unlimited-free guarantee is made. Public standard runners have different allowances; do not make private code public solely for this setup. Public repository schedules can be disabled after 60 days of inactivity.

The workflow deliberately receives no AI or email credentials. It generates source-excerpt editions without paid AI or email delivery. Keep email delivery disabled in Daybreak Settings. The Render API may sleep; wake it by opening its /health URL and retry the website after it responds.

The code and unit tests are local; a real GitHub run with your Supabase project is still required. See EXTERNAL-SETUP.md for database migrations and Netlify environment configuration. The paid-worker instructions there are replaced by this workflow for the free-tier deployment.
