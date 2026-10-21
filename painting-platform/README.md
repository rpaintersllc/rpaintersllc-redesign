# Buzzie: owned painting-services platform pilot

## Conversation send recovery (October 21 update)

The shared homeowner/contractor conversation now locks message submission while a
send and its refresh are pending, including repeated Enter/submit events. It clears
only the exact draft that was sent, preserving new text typed during a slow send.
A confirmed write followed by a failed conversation read explicitly says the
message is saved, asks for a refresh and warns against resending that saved message.
A failed write retains the draft and reuses its idempotency key on a deliberate retry.
The form exposes its pending state through `aria-busy`; backend access and message
idempotency rules are unchanged. This does not add email or SMS notifications.

Validation: **85 Node/DOM tests pass**. Four new mocked tests in
`tests/conversation-send.test.mjs` cover repeated submit while pending (including a
changed draft), preservation of new text, saved-write/failed-read messaging and
retry-key stability. The preservation and refresh regressions both fail against
the previous implementation. `git diff --check` passes. No real conversation,
message, visit, account or email was created. No new browser/mobile evidence is
claimed for this change; the prior desktop request-form evidence remains separate.

Published to the existing owner-private Site from source
`62ccd0d7e697d3fb1bf3e8418d8f25814ed24701`; successful deployment
`appgdep_6ad94392e5f48191a1ba4e1b8d51c410`. The prior Site conversation file was
compared byte-for-byte to the branch baseline before copying the tested change.
No backend, migration, Auth setting, audience or contractor activation changed.

Next: visit-action concurrency/reload feedback and mobile/project-workspace
accessibility review using mocks; genuine account/email and abuse gates stay open.

## Request keyboard navigation and validation (October 21 update)

The three-step homeowner form now treats Enter on the first two steps as Continue,
without attempting to create a project. Step changes focus a keyboard-focusable
heading and expose the current step/title through a progressbar. Final validation
reveals an earlier invalid step before focusing and reporting its field; photo
validation also focuses the selection control. Branding and routing are unchanged.

Validation: **81 tests pass**. Three new regressions cover early Enter, step focus
and accessible progress, and reveal-before-report validation. All three fail against
the previous code. Desktop Chromium QA in the managed preview confirmed loaded
service options, focus on second/third headings, Enter from ZIP advancing to contact,
and native required-name focus. This was a read-only local fixture: only a mocked
provider GET is allowed; all other fetches/writes throw. No contact values, consent,
real lead, upload, account or email were submitted. Mobile and screen-reader device
checks remain pending; desktop accessibility-tree inspection is not that evidence.

`tests/browser-preview.mjs` generates this fixture in an empty absolute scratch
folder under `/workspace/`; run it with `node painting-platform/tests/browser-preview.mjs
<absolute-preview-folder>` and use the Sites managed preview supervisor. Its generated
network stub and HTTP-only UUID compatibility shim must never be deployed. Only
production `request.html` and `request.js` were copied to the Site after comparing
the prior Site files byte-for-byte with the branch baseline.

Published owner-private from Site source `197020eee41496be7cfabc26f0c5b952fd22ea73`;
successful deployment `appgdep_6ad936404748819184e5b0152060acee`. No backend,
migration, Auth configuration, audience or participating contractor changed.

Next: mobile keyboard/layout and project workspace accessibility review using
read-only fixtures; genuine account/email and abuse-enforcement gates remain open.

## Account dashboard display isolation (October 21 update)

The homeowner dashboard now binds each load to its request generation and session
revision. Old cards and account identity are removed before a fresh identity check;
only the newest load for the unchanged session can render projects. Late successes
and failures from a previous account/load are discarded. Sign-in success copy also
waits for a current dashboard result rather than declaring success after a stale
load. A rejected session clears the prior display.

Sign-out immediately removes project cards, account identity, new-password input
and pasted project/email links before waiting for the server logout response. This
prevents a delayed logout or project fetch from leaving private account content in
the visible panel. Server-side project ownership and JWT validation are unchanged;
this fix addresses the client display, not immediate revocation of issued tokens.

Validation: **78 tests pass**, including seven new deferred-response DOM tests in
`tests/account-dashboard-races.test.mjs`: response after sign-out, account switch,
newer refresh ordering, old failure suppression, immediate local sign-out cleanup,
rejected session cleanup and pending identity isolation. The first six regressions
were run against the old implementation and all six failed. `git diff --check`
passes. No real sign-in, account, email, lead, password change or message occurred.

Published to the existing owner-private Site from source
`852813f8a55d75680bf9237987ebda1109b5f025`; successful deployment
`appgdep_6ad926e52e9081919bb0cd7886e3b9e0`. No backend, migration, provider or Auth
setting changed. `LAUNCH.md` records the updated evidence.

Next: browser/mobile and accessibility review of the primary homeowner journey.
Real browser review, native CAPTCHA enforcement and sender/domain/redirect/delivery
verification remain separate launch gates; simulated tests do not complete them.

## Recovery redirects and callback session checks (October 21 update)

Expired or invalid email redirects now show a fixed, actionable message instead
of silently opening a normal sign-in screen. Callback fragments are scrubbed from
the address before configuration requests, preserving the page's query. Duplicate,
incomplete and unsupported callback parameters are rejected; arbitrary error
text from a link is never echoed into the page.

Valid callback credentials still require a deliberate completion click. The
client now verifies the original access identity, exchanges the refresh token,
and verifies the renewed identity matches with a confirmed email before saving
that renewed session. A changed session revision while checking the link blocks
adoption of an older callback. Recovery-specific completion prompts the homeowner
to choose a new password and focuses that field; signup/email confirmation keeps
its own wording. Manual email-link verification and callback completion share
the existing auth-operation lock.

Validation: **71 tests pass**, including eight new mocked callback tests for
expiry/description handling, malformed parameters, early URL cleanup, explicit
completion, recovery/confirmation behavior, mixed identities, failed refresh and
newer sign-in protection. `git diff --check` passes. No real account, email,
sign-in, lead, message or password change was performed. These tests do not
establish SMTP delivery or a real cross-device browser journey.

The static fix is published to the existing owner-private Site from source
`9388f3de653b184aa5cacb29828c0bf89ed062a6`; successful deployment
`appgdep_6ad9192114548191b5384b7d033ef55d`. No backend, database or Auth-setting
changes were needed. `LAUNCH.md` records the behavior and remaining evidence.

Next: review late account-dashboard responses and browser/mobile accessibility.
Native CAPTCHA activation, sender/domain/redirect setup, actual email delivery
and a genuine browser walkthrough remain separate launch gates.

## Native Auth CAPTCHA client preparation (October 21 update)

Homeowner signup, password sign-in and recovery, plus contractor password sign-in,
now support the native Supabase Auth CAPTCHA protocol. The shared helper adds
`gotrue_meta_security.captcha_token` to those requests only, keeping proof separate
from profile metadata and session refresh payloads. Checks reset after each
attempt; homeowner sign-in/recovery share a lock and contractor sign-in rejects
duplicate submissions. Failed security-configuration lookup blocks new auth
attempts until refresh. Native CAPTCHA errors now give a useful retry message.

Provider discovery exposes a separate public `auth_challenge` configuration driven
by `AUTH_TURNSTILE_SITE_KEY`. It does not expose any native Auth secret and does
not assert that Supabase's native CAPTCHA enforcement is enabled. The actual
Auth provider/secret/toggle must be configured in Supabase Authentication settings.
Intake verification and native Auth verification are separate controls.

Validation: **63 tests pass**, with eight new tests covering sign-in/signup/recovery
proof, reset and failure handling, concurrent homeowner attempts, contractor
compatibility, disabled/unloaded helper behavior and public-key separation. No
real sign-in, account, recovery email, lead or message was created. Current Auth
CAPTCHA docs and the official auth-js request protocol were checked. No schema
migration, Auth settings or secrets were changed/read/exported.

Deployment: isolated `platform-api` version 7; existing owner-private Site source
`8e23bc8eb5ab8f13e129614d567457b7c2bfc823`, successful deployment
`appgdep_6ad90ad7d3948191beb717a942b5c1ad`. Read-only live provider lookup returned
200 with R Painters alone and `auth_challenge.required=false`/empty public key.
The new client support is deployed but **real native enforcement remains
unverified**. It is not a completed anti-bot or email-delivery launch gate.

`LAUNCH.md` now describes the correct activation order for both homeowner and
contractor access, including the secure native Auth setting and evidence needed.
Next: browser/mobile review and account recovery edge cases that can be exercised
without sending email. Sender/domain/redirect setup, actual delivery and genuine
CAPTCHA enforcement still need separate evidence before opening public access.

## Configurable intake abuse verification and launch review (October 21 update)

New painting requests and company-interest forms now support Cloudflare Turnstile
through an explicit `PLATFORM_REQUIRE_CHALLENGE=true` server setting. Verification
checks success, the exact submitting Site hostname and the form's action before
any intake RPC. Missing keys, verifier outages, invalid/expired/replayed tokens
and mismatched hostname/action are blocked when the feature is required. Only the
public widget key and availability flags appear in provider discovery. Challenge
tokens are not forwarded into project/interest records. The client clears expired
checks and obtains a fresh check for a create retry while retaining its existing
request UUID/private key. Privacy copy describes the optional external check.

**Prepared and deployed, not activated.** The isolated API is now version 6 and
the existing owner-private Site was deployed from source commit
`bc08cdc41a1854ea897ce17df078022fefce2bf0` (deployment
`appgdep_6ad8fc6c5dfc8191b28b8103889165aa`). A read-only live provider lookup returned
200, only `r-painters-llc`, and `intake_challenge.required=false`. No keys or
settings were retrieved/changed, no external verifier was contacted by tests and
no account, customer lead, photo, email or message was created. Backend source
matched the branch before replacement; guest JWT gateway behavior is preserved.
No migration was needed.

Validation: **55 Node/DOM tests pass**, including 12 new checks for verification,
replay/outage/host/action rejection, configuration secrecy, widget expiry/reset
and protected request retries. `git diff --check` passes. Real widget behavior,
public bot protection and email delivery are not proved by these mocks.

`LAUNCH.md` now records the December 1 review gates, exact secure configuration
steps and evidence still needed. The owner must create a restricted Turnstile
widget and enter its public and secret keys in the isolated Supabase Edge Function
settings, then enable the requirement. Never paste a secret into chat or source.
This covers intake only; direct Supabase Auth signup/recovery needs its own abuse
protection and client integration before launch. The current Site stays private.

Next: prepare Auth abuse protection and account browser verification without
sending email. SMTP sender/domain, redirects, genuine email-delivery evidence and
mobile walkthroughs remain separate launch gates. Security advisors were reviewed;
the remaining leaked-password-protection warning and informational deny-client
RLS findings are recorded with their limits in `LAUNCH.md`.

## Partial photo upload recovery (October 21 update)

The project-page uploader now attempts each selected photo independently, counts
confirmed and unconfirmed uploads, clears the attempted selection and refreshes
the saved gallery even after partial failure. A failed response may still mean
that the photo was saved, so the homeowner is directed to check the gallery and
select only missing photos. No photo is automatically retried. Double submission
is blocked and the file picker is disabled while the current batch runs. Empty,
invalid and over-capacity selections are rejected before any upload starts.

The API helper preserves HTTP error status for access-aware recovery. A transient
lookup failure retains the last loaded workspace and private link with a stale
information notice; additional uploads stay blocked until lookup succeeds.
401/403/404 lookup failures hide the workspace instead. Account uploads still use
the signed-in bearer session and do not manufacture a guest key.

Validation: **43 Node/DOM tests pass**, with seven new mocked project-photo
journeys in `tests/project-photos-ui.test.mjs`. They cover partial success,
response loss after a save, failed gallery refresh and recovery, access denial,
double-click protection, size/capacity checks, and account-owned upload headers.
`git diff --check` passes. No real lead, account, email, photo upload or message
was created; no backend, schema or storage permissions were changed. These are
mocked behavior checks, not a real browser/mobile or live-storage walkthrough.

Published successfully to the existing owner-private Site on October 21 from
source commit `30d0ebfde1cd7ff24d200ec3402342482230873a`; deployment
`appgdep_6ad8efa8d51c8191a7564e91e6bd00d5`.

Next: prepare public abuse protection and an owner-reviewable launch checklist.
Email sender/domain, allowed redirects, actual confirmation/recovery delivery and
browser/mobile walkthroughs remain launch gates. Upload retries across page
reloads are not server-idempotent; homeowners must inspect the gallery before
manually adding missing photos.

## Immediate request receipt and optional-step recovery (October 21 update)

After the create API confirms the saved project, the request page immediately
shows a focused receipt with its private link, copy control and an **Open project**
link in another tab. The request form stays hidden and cannot be submitted again.
Photos continue uploading in the original tab, with progress and a reminder to
keep it open. The receipt explicitly names R Painters as the pilot participant
and distinguishes a free estimate request from a booking. No automatic email
delivery is claimed, and the private key is not automatically remembered.

Photo failures and account-link failures retain the saved receipt and access link;
account-link errors now explain how to recover from the project workspace. Photo
responses lost in transit are described as unconfirmed: check the saved gallery
before adding missing photos. A failed create still permits a retry using the
same request UUID and private key for the existing server idempotency check.
The page no longer automatically redirects after optional work finishes; the
homeowner can copy the link immediately and open the project without interrupting
the original tab's uploads. Closing the original tab can interrupt uploads, and
page-reload recovery of an unconfirmed create is not implemented.

Validation: **36 tests pass**, including four new mocked DOM journeys in
`tests/request-ui.test.mjs`: receipt during a stalled photo upload, duplicate
submit protection, partial upload plus account-link failure, create retry with
unchanged keys, and no-photo account linking. The duplicate-submit assertions
are part of the slow-upload test. Copy fallback, consent forwarding, private-link
fragments and no automatic navigation are also covered. `git diff --check` passes.
No real lead, account, email, upload or message was created during verification.
No backend or migration changes were needed. Mobile visual and real browser
walkthroughs remain unverified.

Published to the existing owner-private Site from source commit
`b5f5fcd2e1f8922bca35d8f96deaf90a18ee751b` on October 21; successful deployment
`appgdep_6ad8e09049508191b2bed9563621745d`.

Next: review partial-upload recovery on the project page and prepare public
abuse protection. Sender/domain setup, allowed account redirects, actual email
delivery and browser/mobile walkthroughs remain launch gates.

## Homeowner session concurrency fix (October 21 update)

Homeowner requests for an expiring session now share a single refresh. Session
revisions prevent a delayed refresh or user lookup from restoring a signed-out
session, replacing a newer login, or clearing a newer login after an old failure.
Sign-out clears tab storage immediately without waiting for a refresh; the
existing server logout remains best-effort. This is client session lifecycle
hardening, not a claim of immediate revocation of every already-issued JWT.
Contractor sessions, database permissions and the isolated API are unchanged.

Evidence: `npm test` passes **32 tests**, including eight new mocked session
regressions in `tests/auth-session.test.mjs`. They cover simultaneous refresh,
sign-out during refresh, successful/failed stale refresh, successful/failed stale
user lookup, failed shared refresh and sign-out before a user lookup starts.
The first seven regressions were also run against the previous implementation:
six failed, confirming they detect the concurrency bugs. `git diff --check`
passes. No real sign-in, email, lead submission or customer message was sent.
No schema migration was needed. The static fix was published successfully to
the existing owner-private Site from source commit
`003a14e8b4c3fefb0bae5acd597bdb8c5490e560` on October 21. Deployment:
`appgdep_6ad8d31c65788191b84ff6ae4c7bab45`.

Next: review request/photo error recovery and enforce public abuse protection
before opening access. Real confirmation/recovery delivery, sender/domain setup,
allowed redirects and mobile/browser walkthrough remain unverified launch gates;
this update does not complete them. Sender setup requires the owner's approved
sending domain/address and configuration in Supabase Auth; credentials must be
entered through the provider's secure settings, never committed here.

## Contractor inbox and approved brand (October 21 update)

The brand is **BUZZIE — Find Your Local Painter**, with discreet **by R Painters**,
the approved dog logo, forest-green backgrounds and pearl-white lettering. The
homeowner pages explain that the local pilot assigns eligible requests to one
participating company, rather than implying a live multi-contractor comparison.
Requesting an estimate is free; submitting does not book painting work.

The contractor dashboard now has name/service/location/contact search, project
status and team-review filters, newest/oldest order, metrics for the latest 100
loaded projects, private internal notes and manual qualification. A review can
be needs-review, qualified-by-your-team, or not-a-fit. It is not independent
contact verification, a billable qualification decision, or a booking guarantee.
Notes and reviews use their own deny-all client table and are returned only by
the membership-scoped contractor API; homeowner lookup never selects them.
Optimistic revisions reject stale saves without replacing newer notes.

Business owners can pause/resume new requests. Staff can manage project reviews
but cannot change intake availability. Both membership and project scope are
checked in the API and server-only invoker RPCs. Pausing removes a provider from
new discovery/routing while preserving existing requests, conversations and retry
idempotence. Provider activation and coverage editing remain managed pilot tasks;
this dashboard does not activate a nationwide paid contractor network.

Validation: 24 Node/DOM tests pass. Transactional SQL checks in
`tests/contractor-controls.sql` passed unauthorized review denial, revision
conflicts, staff availability denial, paused-provider assignment rejection and
existing-request retry preservation. All synthetic changes roll back. No real
customer was contacted, and no fake production-site lead was submitted.
Public SMTP/confirmation delivery, bot protection and real browser walkthrough
remain launch gates. Contractor sessions stay in memory and refresh while the
page is open; contractor and homeowner sessions are kept separate.

## Homeowner accounts (October 20 update)

`account.html` adds email/password registration, sign-in, confirmation/recovery
handling, password changes, sign-out and an account project dashboard. A project
can be linked only by providing its original private key and a confirmed account
email matching the request. Matching an email alone grants no access. Linked
projects reopen with server-validated JWT ownership, including photos, messages
and site visits; account project URLs contain no guest access key. The original
guest capability link remains valid. Signed-in request creation attempts to link
the saved project, but a failed linking step never turns a saved request into a
failed submission. The homeowner can retry from the project or account page.

Sessions use tab-scoped sessionStorage; access tokens refresh and local session
state clears on sign-out. Only server-fetched confirmed Auth identities authorize
account access. The server-only claim RPC checks the confirmed auth user, request
email, capability and current ownership while holding the project row lock. Its
narrow SECURITY DEFINER access is necessary because service_role cannot directly
read auth.users; public/anon/authenticated EXECUTE remains revoked. No direct
client table privileges were added. Homeowner registration does not activate
contractor membership or expose anyone else's projects.

**Public registration is not launched.** Email confirmation remains enabled.
Production SMTP sender/domain, allowed confirmation/recovery redirects and delivery
testing are still required. An account page can also verify the original Supabase
confirmation/recovery URL explicitly, avoiding reliance on an unconfigured redirect.
No fake public account was registered and no confirmation email was sent during
validation. The existing owner's password was not accessed or changed.

Validation: 19 Node/DOM tests pass. Rollback SQL tests passed incorrect-key denial,
mismatched-email denial, unconfirmed-email denial, repeat linking and prevention
of ownership reassignment. `tests/accounts.sql` reproduces those checks in the
isolated pilot and rolls back its synthetic records. Real email delivery and
cross-device browser sign-in remain launch review items.

Private pilot: https://r-painters-projects.jessicuriel27.chatgpt.site

This app is distinct from the existing discovery dashboard. It accepts homeowner
painting projects, routes them to the active local provider, stores private photos,
shows project progress through a private access link, and gives approved business
members their own assigned-project workspace. R Painters LLC is the only active
provider in the Charleston/Summerville pilot. Other US businesses can register
interest; that does not activate an account or promise leads.

## Try the pilot

1. Open the private pilot while signed into the owning ChatGPT account.
2. Choose **Start a project**, use a covered city and ZIP, and clearly label any
   test request. Save the private link shown after submission. Sharing it grants
   access to that project's contact details and photos. **Remember on this device**
   is optional and stores that key in the browser.
3. Open `pro.html` from the business workspace link. Sign in with the existing
   R Painters Supabase account (`rpaintersinsc@gmail.com`) and its existing password.
   Change the sample project's status, then refresh its homeowner page.
4. The owner can also review painting-company expansion interest in that workspace.

## Source and deployment

`web/` is the static application; copy it to the Site's configured `dist/` directory.
`supabase/migrations/` contains the applied schema changes. `platform-api` is deployed
to the isolated lead-engine Supabase project. Apply migrations before deploying
the function. No service-role key or sending credential belongs in the web files.
The public publishable key is intentionally public.

The function validates guest project capabilities itself and validates business
JWTs with Supabase Auth before checking membership. Its gateway JWT requirement is
off so guest project routes can work. Database tables and RPCs deny direct anon and
authenticated access; server-only calls enforce routing and business scope.
Photos use a private bucket and signed 30-minute access URLs. Guest access is not
an email-verified homeowner account. Backend origin checks are browser restrictions,
not protection against a non-browser attacker. Atomic pilot request/photo limits
are additional controls, not a substitute for production bot protection.

Request creation writes the existing lead outbox transactionally. The existing
notification worker sends generic owner alerts; homeowner email delivery and
verified transactional sender setup remain future work. No private alert feed URL,
service credential, or project access token is stored in this source.

## Validation on 2026-10-17

`npm test` passes eight tests covering origin rejection, authentication, foreign
membership denial, private capability requirements, input/body limits, provider
interest scope, and local HTML asset references. `tests/live-pilot.mjs` is a manual
live integration test; it creates a clearly marked synthetic project and therefore
is not run by the default suite. It passed actual routing, duplicate prevention,
private lookup, incorrect-key denial, photo upload and signed-image retrieval.
The synthetic project's ID is `3694c46e-45a3-40c9-8c3d-dc9159eb61ac`.
Rollback-only database assertions passed foreign-business status rejection,
status-event creation, wrong-key photo rejection, five-photo limits, and revoked
anonymous RPC access. The private bucket and owner membership were verified.

No browser automation is available in this environment. Responsive visual review,
real password sign-in, and the full owner-facing browser walkthrough still need
review. API and database checks do not replace that walkthrough.

## Public and national launch gates

### Project conversation and site visits (October 17 update)

Homeowners can now send messages and propose a visit date/time window from their
private project page. Approved business members open **Messages & site visit** on
the project card to reply, confirm or decline. Homeowners can cancel a requested
or confirmed visit. These updates are stored inside Buzzie; there are no automatic
email/text alerts for replies or visits, and users refresh to check for updates.
There is no external calendar reservation or exact arrival-time guarantee.
Dates/windows use America/New_York for the Charleston pilot. Confirming a visit
advances new/contacted projects to visit_scheduled; cancelling a confirmed visit
returns that stage to contacted, without reversing quoted/booked/closed projects.

Messages are plain text, at most 2,000 characters, capped at 40 per side per project
per day and 500 overall. The thread shows the latest 100. Visit preferences are
limited to the next 180 days, ten requests per project and one open visit at a time.
Writes are serialized on the project and retries use client request keys.
The server derives the sender from the project capability or verified business
membership; clients cannot declare their own author identity. New tables deny
direct client access, and the service-only invoker RPC rechecks project scope.

Thirteen tests pass, including DOM tests for safe message rendering and form
wiring, foreign-project denial, sender spoof prevention and homeowner confirmation
denial. Rollback database checks exercised message retries, visit confirmation,
cancellation and status history. The manual live test now covers messages and
visit requests too. Browser visual review and real business sign-in are still
separate review items.

Keep the Site owner-private until the homeowner and business browser journeys are
reviewed, production bot protection is enforced, and the public brand/domain and
transactional sender are configured. National expansion additionally needs provider
verification, activation and coverage administration, homeowner account recovery,
matching rules, complaint/review moderation, billing if sold, and operating support.
There are no invented reviews, verified-contact claims, nationwide coverage claims,
or guaranteed lead volume. The code and project data live in the owner's accounts;
hosting, email, storage and acquisition can incur usage costs as volume grows.

After public launch the platform needs customer acquisition and promotion. External
discovery feeds remain a separate channel and their posts are not automatically
represented as consenting platform customers. The original production website and
repository main branch are unchanged by this pilot.

