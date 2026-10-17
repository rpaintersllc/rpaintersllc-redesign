# Painting Projects: owned platform pilot

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
