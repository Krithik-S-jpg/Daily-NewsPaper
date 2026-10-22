# Architecture and operating notes

## Boundaries

`frontend/` is a Next.js 15 + React 19 TypeScript application. The public reading room uses a historical sample; private operations require Supabase sessions. The UI never uses a service key. Framework-neutral CSS is used instead of Tailwind because the newspaper layout needs a small, specific editorial design system. StPageFlip owns a separate DOM subtree so React can safely mount/unmount the reader. Semantic mode is available and is selected automatically for reduced motion. Mobile pages contain one story; longer summaries continue on subsequent pages.

`backend/app/main.py` validates bearer sessions against Supabase Auth for every private API call. Browser-supplied user IDs are not accepted. Repositories filter by the verified owner; RLS independently denies cross-user reads. Ordinary user JWTs cannot write jobs, editions, or delivery statuses. The service role bypasses RLS, so backend owner checks and their tests remain essential.

`backend/app/worker.py` polls a PostgreSQL job queue. `claim_job` uses row locks with SKIP LOCKED and a lease token. Retries use the same edition identity. `publish_edition` commits the immutable edition snapshot and article rows atomically. Reopening a published edition on retry skips collection/composition. Scheduled insertion and next-run advancement are atomic. Preference writes synchronize the normalized topic and delivery tables in one transaction.

Preferences are stored as versionable JSON in `profiles`, with normalized schedule/topic relations. `articles.content` and `editions.content` retain source attribution and immutable reader snapshots. Source-item hashes deduplicate by canonical URL; normalized headlines suppress duplicate stories. Ranking considers explicit topic phrases, freshness, and source diversity. This is deterministic ranking, not an embedding or semantic clustering system.

Sources are collected sequentially with bounded item counts and timeouts to control upstream load. The AI abstraction supports an extractive provider or a compatible JSON-response provider, validates output, and retries before falling back. This does not guarantee model factuality: review high-stakes stories at the original source.

## Deployment topology

1. Host the Next.js production build on a Node-compatible host. Use HTTPS and configure the public API origin at build time.
2. Deploy the FastAPI container as a persistent service, with HTTPS at the platform proxy. Limit CORS to the actual frontend origin.
3. Deploy the same backend image as a separate worker process, command `python -m app.worker`. Keep at least one worker running; browser/PWA background work is not used for scheduling.
4. Use managed Supabase PostgreSQL. Run migrations before starting services. Back up the database and exercise recovery before launch.
5. Supply server secrets via the host's secret manager, not image layers or committed files. Configure Supabase SMTP, auth redirect allowlists, and email-provider verified domains.
6. Put an edge rate limit on auth/source-validation/PDF endpoints, plus request-body limits and HTTPS. Manual generation is already serialized and limited to one request per five minutes per account in PostgreSQL. Maximum 30 sources per user, 60 items per feed, 20 selected stories per edition.

The scheduler uses IANA zones, skips nonexistent spring-forward times, and chooses the first occurrence of a repeated fall-back time. A long outage coalesces missed executions to one due edition, then advances to the next future run. It does not backfill every missed day. A worker heartbeat renews the lease every minute, and cancels processing if it loses the lease. Publishing validates the lease token within its transaction. Production still needs multi-process contention and restart testing against the actual database.

## PWA and privacy

The manifest provides 192/512 icons and standalone display. The service worker caches only public static assets plus the offline library. It never caches authentication, API responses, or private HTML. Explicitly saved editions are encrypted with AES-GCM under a passphrase-derived key; only ciphertext, a random salt, and IV are persisted. The offline viewer renders decrypted text using DOM textContent, not HTML. Downloaded PDFs also provide offline reading. A real install prompt and service worker lifecycle still need verification on target devices and HTTPS hosting.

Deleting an account calls the Supabase Admin API after verification and relies on foreign-key cascades to remove private rows. Historical editions survive source disconnection, as they should. No other users can open private edition links.

## Operational checks

Monitor queued-job age, expired leases, failed attempts, source retrieval status, email acceptance versus delivery, and database/storage growth. Logs contain job IDs and exception types rather than raw source/provider payloads. Add retention cleanup for `source_items` before production, and determine contractual rights for storing/summarizing each source.

## Reference documentation

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase server user validation](https://supabase.com/docs/reference/python/auth-getuser)
- [StPageFlip](https://github.com/Nodlik/StPageFlip)
- [Resend email retrieval](https://resend.com/docs/api-reference/emails/retrieve-email)
