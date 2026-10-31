# R Painters Lead Engine — MVP

Branch: feature/lead-engine-mvp. Production and main remain unchanged until an explicitly approved release.

## Discovery engine — current development focus
The discovery worker is deployed in Supabase, with active fifteen-minute scans,
private candidate storage and separate generic owner alerts with five-minute
retries. The private Site opens on the discovery dashboard and includes source
setup, current scan health, manual scans and suggested replies. A live Charleston
scan parsed eight notices and returned zero painting matches. Homeowner feeds
still need to be connected by the owner; no real homeowner lead is claimed.
See `discovery/README.md` for the verified state, coverage and remaining setup.

## Available in the private preview
- English, mobile-friendly estimate form with contact consent, strict server validation, hostname-bound Turnstile, honeypot, transactional duplicate prevention and database throttles.
- Owner dashboard: customer details, source attribution, status updates, alert queue state and an authenticated retry action. Supabase Auth user IDs are explicitly allowlisted; tokens stay in memory.
- Manual opportunity research and tracking: official local bid sources, unique original URLs, review statuses. Public opportunities are not inbound customer inquiries.
- Owner email alerts through Resend, containing a generic notice and private dashboard link. Customer contact details remain in the dashboard. A test email was confirmed in the owner's Inbox.
- Transactional outbox, exclusive leases, eight bounded attempts, twelve-hour retry window and idempotent provider requests. Scheduled retry support is in 004-retry-schedule.sql.
- Private help page: web/help.html.

## Deployment
Apply schema.sql, 002-intake.sql, 003-notifications.sql and 004-retry-schedule.sql to the isolated Supabase project, in order. Deploy all functions using supabase/config.toml. Settings belong on the server: ALLOWED_ORIGINS, ADMIN_USER_IDS, TURNSTILE_SECRET_KEY, LEAD_ENGINE_PUBLIC_SUBMISSIONS_ENABLED, RESEND_API_KEY, LEAD_NOTIFICATION_FROM, LEAD_NOTIFICATIONS_ENABLED and LEAD_RETRY_SCHEDULE_ENABLED. Public project and widget configuration is in web/config.js. Never commit server credentials.

When schedule support is enabled, the internal worker securely registers its existing authorization in Supabase Vault and creates a five-minute pg_cron job. Only the database owner can invoke the scheduled dispatcher directly; only service_role can configure it. The cron command contains no key. No network request is sent when there are no due alerts. Rotating the server credential updates the encrypted value on the worker's next successful invocation. Diagnose failed jobs in cron.job_run_details and net._http_response without printing authorization headers.

## Production candidate and release checks
request-estimate-lead-engine.html is a separate root-page candidate. It does not replace the current website's multi-step form. Photo uploads, photo forwarding and DripJobs synchronization are not implemented; customers can share photos during follow-up. Before public release, authorize the exact production origins in ALLOWED_ORIGINS, add those hostnames to Turnstile, verify the sender/domain configuration and test the public URL. Keep the private dashboard link out of customer promotion. Do not change permissions on the private preview.

Tests: node --test lead-engine/tests/*.test.mjs. Rollback-only SQL integration tests are in tests/database.sql and tests/notifications.sql. Handler tests use stubs; live form, inbox and scheduling checks are recorded separately in DEPLOYMENT-STATUS.md.

## Scope and limitations
This MVP captures and organizes requests; traffic requires promotion. It does not scrape social networks, verify customer phone ownership, automatically contact customers, submit bids, synchronize with DripJobs or guarantee job volume. Manual opportunity records require a human to verify scope, current status, dates and qualification requirements. Dashboard lists the 200 most recent records; retention automation and full pagination are future work. Provider acceptance is distinct from inbox delivery; delivery webhooks are not configured.
