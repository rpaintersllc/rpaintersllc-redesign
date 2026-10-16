# R Painters Lead Engine — MVP (development only)

This directory is isolated from the existing production website. Do not merge until deployment credentials, RLS policies, spam controls, email delivery, and end-to-end tests are verified.

## Two connected engines
- **Inbound:** first-party homeowner requests, stored in PostgreSQL.
- **Discovery:** curated public bid/opportunity URLs; these are NOT customer inquiries and are never counted as inbound leads.

## Free-first architecture
- Existing static site stays unchanged.
- Supabase free-tier project: Postgres + Auth + Edge Functions.
- Public request submission via Edge Function with server-side validation and rate limiting (to be implemented).
- Admin access only through Supabase Auth; never expose service-role key in a browser.
- Email notifications through a provider with a free allowance, configured later. No fake success messages.
- Discovery begins with manually reviewed, public sources; automated ingestion only after source terms and permissions are reviewed.

## Release gates
1. Deploy database migration to isolated Supabase project.
2. Configure authentication and RLS; prove anonymous SELECT/UPDATE is denied.
3. Deploy API, test valid/invalid/duplicate requests and spam throttling.
4. Verify photo upload permissions, consent and retention.
5. Verify email delivery and attribution events without sending PII to analytics.
6. Run mobile/desktop tests and back up old estimate form.
7. Switch traffic only after a confirmed end-to-end test.

No production deployment has occurred.
