# R Painters discovery runtime

The hosted worker is deployed in the existing isolated Supabase project. It reads
configured sources, filters potential local requests, deduplicates original URLs,
saves candidates and queues generic owner email alerts. It does not contact prospects.

## Current live state — October 17, 2026

- discover-opportunities v2, admin-leads v16 and notify-opportunities v1 are active.
- Discovery cron is active every 15 minutes; opportunity-alert retry cron is active every five minutes.
- Live worker scan returned HTTP 200, parsed eight Charleston open notices and rejected all eight as unrelated services.
- One clearly labeled SYSTEM TEST record verified the dedicated opportunity outbox and provider acceptance on attempt one at 13:30:51 UTC. Inbox delivery was not independently confirmed.
- The private Site dashboard is published from source 80fd94335baa487176b6daf66fc2d210b19935cc.
- 31 Node tests and seven Python tests pass. Dashboard interaction checks use mocked services; a live authenticated browser walkthrough remains unverified because browser controls are unavailable.
- No homeowner feed is connected yet. No real homeowner lead is claimed.

## Owner source setup

Open https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin.html and sign in
with the existing R Painters application account. The dashboard opens on
Discovered opportunities. Follow Connect homeowner request searches to create
Google Alerts with RSS delivery, when available, then paste their feed URLs into
the source form. Click Check connected sources now to validate the feeds.

The interface contains three ready-to-copy searches for painters, drywall repair
and cabinet painting in Charleston/Summerville. Up to five homeowner feeds are
supported. Their URLs are stored only in the protected discovery_sources table;
status responses return names and IDs rather than private feed URLs. Sources
must use the exact reviewed Google Alerts feed URL format. No account password
or new server credential needs to be copied into this application.

Google Alerts coverage is incomplete: posts may be missed or indexed late.
A new feed publication timestamp does not prove that an original request is new.
Candidate cards preserve this distinction and require original-source review.
Facebook groups, Nextdoor and paid lead-platform data are not connected.

## Runtime design

The Edge Function uses the pinned linkedom parser and exact source-host/path
validation. It never fetches result links, follows redirects, executes source
scripts, extracts hidden contact details or sends messages to prospects.
Requests and response sizes are bounded. Concurrent scans acquire a database
lease and scheduled checks skip redundant runs.

Original URLs are canonicalized; unique URLs preserve the owner's existing
Relevant/Dismissed decisions. Unrelated services, obviously filled requests,
advertisements, hiring posts and nonlocal requests are filtered. Homeowner
entries require request language and a zoned feed publication time within 24
hours. This is candidate classification, not identity or intent verification.

An opportunity insert atomically creates its separate notification outbox entry.
The existing sender and fixed owner destination are reused inside Supabase.
One queued alert is attempted after a scan. Remaining or interrupted alerts are
checked every five minutes, with exclusive leases, provider idempotency keys and
at most eight attempts in a twelve-hour window. Failed email does not remove
the stored opportunity. Provider acceptance is distinct from inbox delivery.

## Deployment and verification

Fresh project order: original schema/intake/notification migrations, then 005,
007 and 006 (006 includes schedule activation and must follow outbox creation).
Deploy discover-opportunities, notify-opportunities and admin-leads before
activating schedules. Existing production website and main branch are unchanged.

The dispatcher reuses internal authorization already encrypted in this same
project's Vault. The agent never reads or exports the decrypted credential.
Service callers are checked inside the worker as well as by the gateway.
Anonymous and ordinary authenticated roles cannot read source settings,
read scans, claim work or invoke the dispatcher.

Run the checks:

```sh
npm ci --prefix lead-engine/discovery --ignore-scripts
node --test lead-engine/tests/*.test.mjs
python -m unittest discover -s lead-engine/tests -p 'test_*.py'
```

The Python CLI is retained as a local dry-run/reference implementation. The
hosted runtime is the TypeScript Edge Function; it needs no separate runner.
The manual GitHub workflow validates code and public-source availability without
uploading prospect data or using new credentials.

Remaining setup: connect and validate real homeowner request feeds; complete an
authenticated live browser walkthrough. No verified homeowner request, exclusive
lead or job is promised. The private dashboard is a research tool and does not
need customer promotion.
