# BUZZIE launch review — target December 1, 2026

Status reviewed October 22, 2026. The target is a review date, not a promise of
public availability. Keep the existing Site owner-private until the gates below
have evidence and the owner authorizes opening it. R Painters remains the sole
participating contractor; external discovery stays a separate channel.

| Gate | Current evidence | Remaining action |
| --- | --- | --- |
| Request, receipt, photos, messages and visits | 370 mocked Node/DOM tests pass through the local verify command; isolated API version 8 now includes the tested upload cleanup fix, preserving exact-object deletion attempts after metadata errors and using unconfirmed-result guidance; read-back source matches d4a895d and four harmless live smoke paths pass before/after publication; real Storage cleanup remains unverified; failed photo previews show numbered recovery guidance and ignore stale image events; conversation sends require an initial authorized read; rejected reads/writes retire thread/draft/visit controls and stale reads; rejected project lookups retire cached private data before transient fallback; account-only conversation reads/messages/visits now guard session changes before dispatch and response acceptance (13 mocked cases, ten detect the prior bug), with fresh-read recovery and already-sent-write guidance; retired/replaced conversation handlers and late results now stop before further dispatch, rendering or visit callbacks (15 mocked regressions; code-only, pending Site publishing authorization); 12 browser modules statically linked without evaluation; status/availability controls now block repeat events and stale workspace feedback; status display uses the confirmed submitted value; private review saves block repeated submits, distinguish newer unsaved edits and ignore replaced-card responses; Chromium narrow-frame request/project/signed-out account layouts checked at 320/390/768px; long-contact project overflow fixed; message-history region reachable by Tab; project lookups discard stale successes/failures and uploads wait for a current gallery; visit action concurrency, stale reads and saved-change/failed-reload recovery covered; message sends preserve newer drafts, block concurrent sends and distinguish failed reads after a saved write; desktop request-step focus, Enter navigation and required-field checks verified in read-only local browser fixture; prior rollback database checks in README; automatic request linking is pinned to the initiating session and late claim replies cannot assert current-account ownership (eight mocked regressions); same-account token renewal conservatively requires deliberate linking; late account hints preserve edited/cleared/browser-filled contact fields and skip saving/receipt states (ten mocked cases, six detect the old bug); synthetic request receipt/partial-photo/retry journeys reviewed at 320/390/768px (tests/REQUEST-BROWSER-QA.md) | Corrected unsaved-create retry verified in Chromium at 390px: failure returns focus to enabled submit, second Enter reaches receipt and Tab reaches Open project (two synthetic creates, zero uploads; document/scroll widths 375px); Seeded-session project message/visit/denial journey checked in Chromium at 390px and capability read at 320px; post-request focus correction is now implemented/code-only with 14 mocked cases (four detect prior behavior) and Chromium Enter/heading/Tab confirmation at 390px (tests/PROJECT-BROWSER-QA.md); Physical-mobile, screen-reader and full genuine authenticated project/account walkthroughs remain pending; all narrow-frame checks use synthetic read-only data, not live intake |
| Homeowner access and contractor separation | Account photo batches now pin one acquired bearer and stop remaining files/retire the old view on a session change; ten mocked cases pass, seven detect prior behavior; already-dispatched uploads may finish and must be checked before manual retry (tests/PROJECT-UPLOAD-SESSIONS.md). Account-backed lookups now reject stale session reads/results and retire prior-account cached data before refresh under a new session; eleven mocked cases pass, eight detect the old bug; same-session fallback/renewal and private capability links retain their behavior (tests/PROJECT-LINKING.md). Manual workspace linking now locks repeated events and uses a session snapshot before dispatch/feedback; eight mocked cases pass, six detect the old bug; deliberate normal renewal stays supported (tests/PROJECT-LINKING.md). Sixty-five self-contained live RPC rollback checks pass for ownership, review/availability permissions, company scope, photo metadata capacity/expiry, rolling-day/total message caps and retries, visit date/history limits and later pipeline preservation; all synthetic rows revert with zero remaining fixture leads/users/companies. These are operator RPC checks, not full JWT/browser proof. Twenty gateway matrix tests cover foreign-homeowner photo/conversation/visit access and foreign-workspace selection; October 22 metadata report confirms RLS/no client table CRUD on six selected tables and no client EXECUTE on seven server functions; see tests/ACCESS-BOUNDARIES.md for limits. Synthetic Chromium account sign-in/recovery/error states reviewed; password/button Enter now focuses the visible identity heading, with Tab continuing to Refresh projects; signed-in dashboard fits 320/390/768px after email-heading wrap fix; ACCOUNT-BROWSER-QA.md records limits. Sign-in/signup adoption and recovery feedback now ignore responses across logout/new login; newer password drafts survive; conditional signup wording avoids asserting delivery. Pasted email links and callbacks now preserve newer sessions/feedback and distinguish verified-link/failed-account loads; twelve new mocked cases pass. Project-link/password mutations now reject duplicate events, preserve newer field edits and ignore stale-session results; saved links distinguish failed list reloads; 15 new mocked cases pass. Account ownership, capability links, membership scope and session-race tests; 401/403/404 project denial cannot reopen cached data after a later network failure; contractor renewal now coalesces concurrent refreshes and discards late success/failure after logout or a newer login (three UI regressions fail against the old code) | Selected synthetic signup outcomes and callback/manual confirmation keyboard focus reviewed; ten mocked recovery cases now verify focus ownership and newer-draft preservation; full genuine sign-in/recovery journey and cross-account access remain pending |
| New request and company-interest abuse checks | Turnstile frontend and server verification implemented; disabled in the private pilot; mocks cover failures/replay/host/action | Owner configures a widget and secure settings; verify actual widget behavior before activation/public access |
| Auth sign-in/signup/recovery abuse checks | Homeowner and contractor clients now support native Auth CAPTCHA proof; native settings unchanged and enforcement unverified | Configure the public Auth widget key and native Supabase Auth CAPTCHA; verify server enforcement plus rate limits before launch |
| Confirmation/recovery email | Code prepared; no real external delivery evidence | Owner approves sender address/domain; configure SMTP and allowed redirects, then verify genuine delivery through an authorized flow |
| Owner notifications | Read-only queue/scheduler reports verified October 22; five synthetic SQL checks pass; no pending/failed queue records at 09:59 UTC; 288 successful dispatcher SQL runs per retry job over 24h; acceptance/SQL success do not prove delivery | Verify notification delivery with permitted fixtures; messages/visits do not currently send email/SMS |
| Operations | Sixteen live rollback routing assertions and ten mocked gateway cases verify selected-company/state/city-list/ZIP-prefix boundaries, no fallback and stable receipt assignment after pause/deactivation/coverage edits; all fixture lead/company/project counts zero after rollback (tests/ROUTING.md). One active real provider, manual qualification, pause control; operator runbook in operations/README.md separates project/direct/discovery counts without customer content or worker dispatch | Name support contact/process, review retention/privacy copy and actual configured service coverage before opening |
| Public release | Owner-private Site retained | Close the gates, review evidence and obtain owner's explicit public-release instruction |

Contractor billing, nationwide activation and paid acquisition are outside the
initial one-contractor pilot. No plan, domain purchase or new paid service is
required or authorized by this document.

## Activate request verification safely

1. In the owner's Cloudflare account, create a Turnstile widget restricted to
   `r-painters-projects.jessicuriel27.chatgpt.site` (and only other explicitly
   approved Buzzie hostnames). Do not change DNS or buy a domain.
2. In the isolated Supabase project's Edge Function secure settings, enter
   `TURNSTILE_SITE_KEY` (public widget key) and `TURNSTILE_SECRET_KEY` (secret).
   Enter the secret only in the provider's secure settings; never paste it into
   chat, a repository, shell arguments or an issue. Do not retrieve/export an
   existing secret. These settings are separate from the Site's runtime settings.
3. Set `PLATFORM_REQUIRE_CHALLENGE=true` last. Keep the Site private. When required
   and a key is missing, the API intentionally blocks new intake with 503.
4. GET `platform-api?action=providers` from the permitted Site origin should
   report `intake_challenge.required=true` and `available=true`. Only the public
   widget key appears in that response. No secret is exposed.
5. Review the widget in both Start a project and Register your interest. The
   server must accept only the matching Site hostname and the correct action:
   `project_request` or `provider_interest`. Widget rendering alone is not proof
   of server verification. Expired/replayed tokens must be rejected; an outage
   must block intake. Use the mock suite for automated success/failure checks;
   never use Cloudflare's public testing secret as live protection or submit fake
   customer leads to establish evidence.
6. Document a genuine, separately authorized end-to-end verification before
   marking this gate complete. If activation is incomplete, keep public access
   closed. Setting the flag back to false restores unprotected private-pilot
   intake; it is not a safe public-launch rollback.

Tokens expire and are single-use. If a saved response is lost, the client gets a
fresh challenge while keeping the same project request UUID/private key, allowing
the existing database idempotency check to return the original request. Challenge
values are not stored in project/interest records. Cloudflare receives the token
and widget secret for validation; Buzzie does not forward form contacts or photos
to Siteverify. The widget's technical processing is disclosed in privacy.html.

## Activate native Auth verification separately

Account sign-in, homeowner signup and password recovery now send the widget proof
in `gotrue_meta_security.captcha_token`, matching Supabase's native Auth protocol.
Contractor sign-in supports the same protocol. Proof is kept out of profile
metadata, reset after each attempt and never added to session refresh requests.
The homeowner sign-in/recovery controls share an in-flight lock; contractor
sign-in also rejects duplicate submissions. A failed configuration lookup blocks
new sign-in/signup/recovery attempts until the page is refreshed successfully.
Existing signed-in account access, manual email-link verification, project linking
and password updates continue through their existing session/capability checks.

1. Create or intentionally reuse a Turnstile widget restricted to the approved
   Buzzie hostname. In the isolated Edge Function settings, configure only its
   **public** key as `AUTH_TURNSTILE_SITE_KEY`. This is separate from the intake
   settings above; no Auth secret belongs in this Edge configuration.
2. With the Site still private, review both `account.html` and `pro.html` using
   the deployed client. A nonempty public key renders a check in both pages.
   Provider discovery's `auth_challenge.required` means the client should render
   a check; it is **not evidence** that native Auth CAPTCHA is enabled.
3. In Supabase Authentication → Bot and Abuse Protection, select Turnstile and
   enter the matching secret through the secure settings, then enable CAPTCHA.
   Do not read/export existing secrets or put them into chat or code. These native
   settings were not changed by the implementation. Intake's
   `PLATFORM_REQUIRE_CHALLENGE` does not switch native Auth enforcement on.
4. Verify native enforcement and rate limits through a separately authorized
   genuine account journey; do not register fake users or send test emails to
   people. The automated suite uses mocks only. Token-free attempts must fail
   once native CAPTCHA is enabled, and both homeowner and contractor sign-in
   need an actual browser walkthrough before the gate is complete.
5. Keep public access closed until matching keys, native enforcement and recovery
   delivery have evidence. Removing the public UI key while native enforcement
   remains enabled can block sign-in; coordinate any rollback in both settings.

Protocol and configuration references:
https://supabase.com/docs/guides/auth/auth-captcha
https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts

## Email-link recovery review

Expired/invalid redirect fragments show a fixed actionable message without echoing
an arbitrary error description. Callback fragments are removed from the address
before configuration requests, while the page query is retained. Valid links
require a deliberate completion click. Before saving a session, the client checks
the original access identity, exchanges the supplied refresh token and checks
that the refreshed identity matches and has a confirmed email. A newer sign-in or
sign-out while verification is pending prevents adoption of the older callback.
Successful recovery opens the new-password step; confirmation uses different copy.

These flows were verified with mocked responses only. Real email delivery,
redirect configuration, security scanners consuming links and cross-device
browser behavior remain unverified. Do not mark delivery complete based on these
checks. Password changes still require a valid server-verified session; no real
password was accessed or changed by the tests.

## Account dashboard session isolation

Dashboard loads use both the latest load generation and current session revision.
Each new load removes old cards/identity before checking the active account.
Late successes and failures cannot update a newer load or another account's view.
Sign-out clears cards, account identity and private-link/password inputs locally
before awaiting server logout. A rejected session also clears the previous view.
This is client display isolation; server ownership checks remain the authority.

Seven race tests use deferred mocked responses. The initial six tests all failed
against the prior implementation and now pass, alongside the additional pending
identity check. No real account was signed into or out of during verification.

## Evidence and limits

- `npm run verify`: 12 browser modules statically linked without evaluating app
  code; 217 tests pass, including twenty account/contractor access-boundary cases with positive controls and a seven-failure ownership-filter fault injection, seven account-focus cases (three fail against the prior code), three isolated account browser-fixture boundary checks, eighteen Auth-action response cases (fifteen fail against the prior account.js), twelve email-adoption UI cases (nine fail against the prior account.js), thirteen account-mutation UI cases and two token-snapshot helper cases; nine of the first eleven UI cases fail against the prior account.js. Also includes four photo-display recovery regressions (all fail
  against the prior code), seven conversation access/recovery regressions (all
  fail against the prior code), five project access-denial/recovery regressions (all fail
  against the prior code), five fault-injection checks of the verifier, nine status/availability UI cases (eight
  fail against the prior code), five private-review save cases (four fail
  against the prior code), six contractor-session helper cases, three
  contractor-refresh UI regressions (all three fail against the prior code), two responsive-fixture network-boundary tests and five project-refresh ordering/gallery regressions
  (all five fail against the prior code), six visit-action regressions, four
  conversation-send regressions, three request-keyboard regressions and seven account-dashboard race regressions
  covering sign-out, account changes, response ordering, stale failures, immediate
  local cleanup, rejected sessions and pending identity checks. No real challenge token, account, lead, upload, email or message
  was created by these tests.
- Supabase security advisors reviewed October 21: 16 informational RLS-without-
  policy findings align with the intentional server-only deny-client tables.
  Do not add permissive policies to silence them. One warning remains for leaked
  password protection being disabled; check availability in the current plan
  before considering a change, without authorizing an upgrade or expense.
  Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Current Supabase changelog reviewed: older TLS 1.2 cipher removal is scheduled
  for November 10. Include supported modern browsers/devices in the walkthrough;
  no SDK or TLS configuration change was needed for this fetch-based feature.
- No real Cloudflare verification, email delivery or public-launch readiness is
  claimed by mocked tests or by deploying the disabled integration.

References:
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
https://supabase.com/changelog/cbc-tls-ciphers-deprecated
