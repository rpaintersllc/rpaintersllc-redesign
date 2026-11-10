# BUZZIE launch progress — October 23, 2026

## What was inspected

- Current GitHub branch `feature/lead-engine-mvp`, baseline `dbbe887`.
- Owner-private Site `appgprj_6ad381533a388191952df8df6da8f1e4`, live version 40 at start.
- Live platform-api v8, notify-leads v7 at start; real provider, project/queue counts,
  public Auth settings, security advisories and current Supabase SMTP documentation.
- One active/accepting company: R Painters LLC, SC, configured Charleston-area cities
  and ZIP prefix 294. At start: two projects, six accepted notification records.
- Native Auth email enabled, confirmation required, signup not globally disabled.
  The Site remains owner-private. Empty public challenge keys are not proof of
  native Auth settings; intake enforcement explicitly reports false.

## New implementation

`notify-leads` v8 resolves each claimed lead's persisted `platform_projects` mapping.
Buzzie requests get a Buzzie subject and `/pro.html?project=<id>` destination.
Direct R Painters requests retain their separate `/admin.html` destination.
Only fixed owner email receives these pilot alerts. No private capability, contact
information, or free-form customer content is put in the email. The existing
idempotency key, lease completion, retry schedule and JWT checks are preserved.
Mapping failures retry without sending to a guessed destination.

The contractor UI filters its authorized loaded projects by a valid linked project
ID, explains that sign-in controls access, and offers Show all projects. Unavailable
or filtered-out requests show recovery guidance. The query is a navigation hint;
it grants no access and cannot bypass existing business membership checks.
Only pro.html/pro.js were copied to the Site checkout and published owner-private.
Site source commit: `b19ccb6ae434a6d5bd62a3cf7bb95676e2ab0cf4`; deployment
`appgdep_6adb50efcc508191baa5f40ed18ace4c` succeeded at 12:20:10 UTC. An existing difference in
conversation.js between hosted source and GitHub is deliberately preserved.

## Genuine checks

Authorized test project: `508d4535-ea9f-4b50-813f-197b7509add2`.
Name: `BUZZIE TEST — launch verification`. Explicit test-only scope, owner's
existing business email/phone, Summerville 29483; no new customer identity/address.

| Check | Observed result |
| --- | --- |
| Production `create` | 201; persisted assignment to R Painters LLC |
| Repeat same create | 200; duplicate true; same project ID |
| One tiny synthetic PNG upload | 201; one ready photo |
| Private lookup and signed image fetch | 200 / 200 |
| Incorrect private capability | 404 |
| Notification queue | accepted; one attempt |
| Gmail actual receipt | 2026-10-23 12:16:35 UTC / 08:16:35 EDT; subject New BUZZIE painting request |
| Owner recovery request | Auth recover 200; email received 12:16:55 UTC / 08:16:55 EDT |
| Password/confirmation link completion | Not performed; owner password unchanged |

Gmail evidence: notification message `1a168b10a66d3137`, recovery message
`1a168b158b783be2`. Access tokens and recovery URLs are omitted from this record.
The clearly labelled test and photo remain available for owner review in the
private pilot. They are not a real lead and should not be treated as a job.

The sender is still the existing test sender (`onboarding@resend.dev`) for alerts,
and Supabase's default sender for recovery. These owner-only deliveries do not
establish verified-domain SMTP or delivery to external homeowners.

## Automated checks and limits

- Platform verifier: 12 browser modules checked; 371 Node/DOM/API tests passed.
- Notification suite: 15 tests passed, including Buzzie/direct destination separation
  and three destination-failure retry cases. These use mocked provider replies.
- Added contractor-linked-request DOM test checks notification filtering and Show all.
- notify-leads v8 source read-back equals the tested local source; JWT retained.
- Local browser preview shows the signed-out page, but live API rejects the local
  preview origin. No authenticated contractor browser walkthrough is claimed.
- Existing security advisory: leaked-password protection disabled; no permissive
  table policies were added to silence intentional server-only RLS findings.

## Remaining release work

1. Configure approved Buzzie sender/verified domain and custom Auth SMTP; set/review
   allowed account redirects; verify external signup confirmation and completed recovery.
2. Configure owner Cloudflare Turnstile widget/keys and native Auth CAPTCHA securely;
   verify real server rejection, success, expiry/replay and rate limits.
3. Authenticated contractor and homeowner browser journeys, physical mobile and
   screen-reader checks. Signed photo expiry/cleanup beyond this single upload.
4. Support contact, retention/privacy review and controlled real-user pilot.
5. Other contractor approval/areas/recipient routing and billing remain future work;
   no paid onboarding or charges were enabled.

No public access, purchases, DNS edits, password changes, provider availability
changes or real-customer contact were performed. Target: December 1, subject to gates.
