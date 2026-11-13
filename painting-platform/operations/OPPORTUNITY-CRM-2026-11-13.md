# BUZZIE private opportunity desk — November 13, 2026

## Scope and existing state

PR #7 remains an open draft (feature/lead-engine-mvp → main). The feature base was
6c70c7c1d39b78a1e7796ecda435d7a550724e6a. Work is isolated on
feature/buzzie-opportunity-crm. No public R Painters page is part of this change.

The existing six discovery sources are live. Their latest inspected scan had no
new matches; the one existing opportunity was discarded. Running scans is not
proof of acquisition. Consenting homeowner requests remain a separate workflow.

## Implemented

- Private owner-only opportunities.html, matching BUZZIE forest/pearl branding and
  logo. Stages: new, review, approved, sent (confirmed CRM receipt), discarded.
  Filters combine location, project type, publication age, source and priority.
- Records retain original link, source, dates, scope, public contact permission,
  direct/subcontract classification, reason, priority and verification checks.
  Team assessments are not independent identity/phone or profitability verification.
- The new buzzie-opportunities API (actual slug: `buzzie-opportunities`) verifies
  the exact bearer through Auth, current session_id, confirmed email and R Painters
  owner membership. No service key, bridge key, frozen payload or receipt credential
  is returned to browser clients.
- Permitted public SCBO catalog check, manually initiated, five-minute server
  throttle and the source's crawl delay. Fixed government URLs only, redirects
  refused, bounded response size, no social scraping or arbitrary URL fetching.
  Catalog candidates require original document/eligibility review. Publication
  date is calendar-only when no time is supplied; unknown time is disclosed.
- Existing source feeds continue separately. Manual original-link capture
  canonicalizes tracking parameters and deduplicates by original URL. A business
  directory entry alone is not treated as a hiring opportunity.
- Every manual approval records a revision and snapshot. Explicit Send to CRM
  requires an approved, checked, current opportunity. Payload freezes on first
  authorization. Leases prevent concurrent double sends; manual retry uses the
  same reference/snapshot, backs off for one minute and stops at five attempts.
  Each attempt and outcome is retained. No automatic scheduler was added.
- Dedicated `buzzie-intake` CRM receiver, scoped hashed credential, no browser CORS.
  It preserves source/date/scope and creates a cold prospect without fabricating a
  customer, email, phone, consent, quote, booking or revenue. The dedicated key is
  encrypted in the BUZZIE Vault; CRM stores its hash. Existing website keys,
  website-intake, payment endpoints and notifications were not reconfigured.
- A concurrent CRM integration migration appeared during inspection. The bridge
  was adapted to its canonical `crm_import_buzzie_lead` registry, source-URL
  deduplication and BUZZIE metrics instead of maintaining a separate lead cohort.
  The canonical receiver and CRM UI work from the other change were not overwritten.
- Natural English response drafts differ for direct homeowners, subcontract
  invitations and public bids. They are displayed only; nothing contacts anyone.

## Verification so far

- Node 24: 540 mocked Node/DOM tests, including auth/session/owner rejection,
  explicit send authorization, receipt identity matching, timeout handling,
  stale/unverified approval, filters, drafts, UI cleanup and receiver credential
  hashing. All browser modules statically link. These are simulated requests.
- 22 BUZZIE workflow assertions and 14 CRM receiver assertions passed against real
  databases using rollback-only synthetic records and service_role RPC execution.
  Covers scopes, frozen snapshots, backoff, attempt history, duplicate reference,
  conflicting payload, dry-run/no-persistence, no fabricated contact and grants/RLS.
  Fixture rows/organizations remaining: zero. Mocked receipt IDs in workflow SQL
  are not evidence of a cross-server CRM transfer.
- Read-only live SCBO catalog parse at 2026-11-13T14:18:37Z: 124 notices inspected,
  one local painting candidate. Jennie Moore Elementary School Painting & Signage,
  Mount Pleasant, published October 29, due December 1 at 2 PM Eastern.
  November 10 pre-bid has passed; eligibility and profitability remain unconfirmed.
- Owner-private Site audience checked: owner only, zero external visitors.
- Security findings: BUZZIE gains six intentional server-only RLS/no-policy INFO
  tables; existing leaked-password WARN remains. CRM's pre-existing three
  authenticated SECURITY DEFINER warnings and leaked-password WARN are not changed
  or silenced by granting permissive access. Review the separate CRM work before
  attributing simultaneous advisory changes to this branch.

## Platform limits

Meta prohibits unauthorized automated collection; signing in is not permission:
https://about.fb.com/news/2021/04/how-we-combat-scraping/
Nextdoor disallows scraping/copying outside its supported sharing features:
https://nextdoorcrm.my.site.com/s/article/Member-Agreement-US-2026?language=en_US
No Facebook/Nextdoor bot or credential scraping is implemented. Nextdoor is link-
only in this desk; approval/export is blocked until a permitted integration exists.
Public directories may support prospect research but do not prove hiring intent.

## Operator review

Open /opportunities on the existing private BUZZIE Site. Use the approved R Painters
owner account. Check SCBO bids, open each original, review publication/eligibility,
classify direct/subcontract and explain why the job is worth pursuing. Confirm the
four source/fit checks before approval. Send only when you choose to transfer that
specific opportunity. Draft replies must be copied/reviewed/sent manually.

CRM imports use reference buzzie:<opportunity UUID>. A failed/uncertain transfer
must be inspected on Refresh. Retrying cannot edit the frozen snapshot or invent a
new reference; verify the same original in CRM. Automatic sync remains absent/off.

## Recovery and remaining work

Disable manual sends by setting buzzie_crm_config.manual_enabled=false (actual
table: public.buzzie_crm_config), or disable only the dedicated CRM integration.
Keep existing records/receipts for idempotency. Roll back Site source to
0a7229149890bf4bd4ab347e8dbe88cd49160f51 if needed. New functions are isolated;
platform-api v20 and the legacy Lead Engine functions are unchanged.

No actual approved opportunity has been transferred in this session. Real owner
sign-in, physical phone testing and the first owner-approved business transfer
must be distinguished from mocks and SQL rollback evidence. More permitted B2B/
property-manager sources need an actual hiring request, not a list of names.
Branded email/native Auth CAPTCHA remain separate older launch gates. No public
launch, spending, new subscriptions or automatic outreach is authorized.
