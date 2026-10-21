# Buzzie: owned painting-services platform pilot

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

