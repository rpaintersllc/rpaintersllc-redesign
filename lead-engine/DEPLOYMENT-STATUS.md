# Discovery deployment update — October 17, 2026, 09:35 Eastern

Private opportunity dashboard: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin.html

- Discovery worker v2 and owner API v16 are deployed. Opportunity notifier v1 uses its own atomic outbox.
- Active discovery schedule: every 15 minutes. Active opportunity-alert retry schedule: every five minutes. Existing website-request retries remain separate.
- Live worker at 13:32:56 UTC returned HTTP 200, parsed eight open Charleston notices and found zero painting matches.
- SYSTEM TEST opportunity alert accepted by provider on attempt one at 13:30:51 UTC. Inbox delivery unconfirmed; test record marked Dismissed and explicitly synthetic.
- Public unauthenticated discovery request returns HTTP 401. Anonymous/ordinary-user source reads and scan/dispatcher privileges checked and denied.
- 31 Node tests and seven Python tests pass. Includes parser, qualification, size limits, authorization, deduplication, source errors, queue separation and a mocked dashboard interaction test.
- Private Site published from source 80fd94335baa487176b6daf66fc2d210b19935cc. Owner-only access preserved; home page opens the opportunity dashboard.
- Remaining: owner must create/connect Google Alerts RSS feeds, validate live homeowner inputs and complete authenticated browser walkthrough. Browser controls are unavailable in this session. No verified real homeowner lead is claimed.
- Production business website and main remain unchanged. Do not promote the private research dashboard to customers.

## Earlier intake verification record

# Private MVP deployment status — October 17, 2026 UTC

Preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Dashboard: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin
Guide: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/help.html

Verified:
- Protected estimate form saves requests; authenticated owner dashboard reads and persists lead status updates.
- First generic owner alert confirmed delivered in Resend and the Gmail Inbox at 02:02 UTC.
- Notification outbox commits atomically with the lead; server credentials never enter browser code.
- Migration 004 applied. Active cron job runs every five minutes. Scheduled execution succeeded at 02:25:00 UTC; scheduler activation test was subsequently accepted on attempt one.
- Controlled requeued test accepted on attempt two using the same provider idempotency key.
- All four notification test records currently accepted with no recorded errors. Acceptance is not the same as inbox delivery; only the first sample inbox receipt was independently verified.
- Twenty handler tests pass; rollback-only database and queue tests passed previously.
- Mobile form at 390px tested without horizontal overflow; successful request and UTM tags verified.
- Latest private UI includes English help and manual opportunity tools. Updated admin backend deployed. Opportunity save/deduplication handler test passes; final authenticated browser save/review flow still needs owner session verification.
- Private UI source version 57067f8f702b650273c1a711e71a0cd1081221ec deployed successfully.

Release boundary:
- Main branch and existing production website unchanged.
- Separate request-estimate-lead-engine.html is a review candidate, not a promoted live customer URL.
- Before customer release: approve production deployment, authorize exact production origins and Turnstile hostnames, review sender/domain, then test the public form.
- Alerts use Resend test sender onboarding@resend.dev and fixed own-account destination rpaintersinsc@gmail.com.
- Manual opportunity tracking does not automatically discover bids or contact prospects.
- Photo uploads, customer auto-replies and DripJobs sync are not implemented.
- Fictional TEST records are not customer leads.
