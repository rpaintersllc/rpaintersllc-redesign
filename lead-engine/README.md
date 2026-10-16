# R Painters Lead Engine — isolated MVP

Development is confined to `lead-engine/` on `feature/lead-engine-mvp`. Production HTML, estimate form, hosting and main remain unchanged.

## Implemented
- English estimate form with required contact consent, service selection, attribution, honeypot and Turnstile.
- Supabase submission API: bounded streaming body, strict validation, CORS preflight, CAPTCHA verification, normalized phone/email, transactional idempotency and database throttles.
- Spanish private dashboard: Supabase Auth password login, server-verified JWT, explicit user-ID allowlist, recent leads, status updates, separate public opportunities view. Tokens remain in memory only.
- `002-intake.sql`: atomic intake RPC, accessible only to service_role. Existing tables retain RLS with no client policies.
- Tests: `node --test lead-engine/tests/api.test.mjs` (Node 24 supports these JavaScript-compatible .ts files).

## Configuration still required before real traffic
1. Apply `schema.sql`, then `002-intake.sql` to the isolated Supabase project.
2. Deploy functions from `supabase/functions/`. Supabase supplies server URL/service key automatically; do not copy these into a browser.
3. Create the owner's application Auth user (dashboard login and Supabase account login are separate). Set ADMIN_USER_IDS to that verified Auth UUID. Never authorize by user-editable metadata or open signup.
4. Configure a free Cloudflare Turnstile widget for the preview hostname, action `lead`. Set TURNSTILE_SECRET_KEY on the server and the public site key in `web/config.js`. Existing credentials must never go in GitHub.
5. Add the project publishable key to `web/config.js`. This key alone grants no table access. Add only the exact preview origin to ALLOWED_ORIGINS.
6. Enable public-function gateway access using config.toml when ready. The admin API independently verifies JWT through Supabase Auth. Submission remains disabled until LEAD_ENGINE_PUBLIC_SUBMISSIONS_ENABLED=true and CAPTCHA is configured.
7. Serve `web/` on a separate HTTPS preview origin (or `python -m http.server 5173 --directory lead-engine/web` for local review). These files are not wired into the production site.
8. Test a real form submission, retry without duplication, reject invalid submissions, confirm unauthorized access denied, log into the owner dashboard, change status, and inspect both screen sizes.

## Not implemented / release gates
Email/SMS/push notifications, photo uploads, automatic opportunity discovery, retention automation and pagination beyond 200 records are not enabled. The UI confirms only database storage; it never claims an email was sent. A verified notification provider and retry/outbox workflow are required before production launch. Turnstile or Auth account setup may require the owner to accept provider terms or set their own password.

Do not merge or route production traffic before a successful live end-to-end test. Automated API tests use stubbed external services and do not prove deployed authentication, CAPTCHA or delivery.
