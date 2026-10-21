# BUZZIE launch review — target December 1, 2026

Status reviewed October 21, 2026. The target is a review date, not a promise of
public availability. Keep the existing Site owner-private until the gates below
have evidence and the owner authorizes opening it. R Painters remains the sole
participating contractor; external discovery stays a separate channel.

| Gate | Current evidence | Remaining action |
| --- | --- | --- |
| Request, receipt, photos, messages and visits | 55 mocked Node/DOM tests pass; prior rollback database checks are recorded in README | Real browser and mobile walkthrough; use mocks or rolled-back fixtures for automated testing |
| Homeowner access and contractor separation | Account ownership, capability links, membership scope and session-race tests | Review full sign-in/recovery journey and cross-account access in a browser |
| New request and company-interest abuse checks | Turnstile frontend and server verification implemented; disabled in the private pilot; mocks cover failures/replay/host/action | Owner configures a widget and secure settings; verify actual widget behavior before activation/public access |
| Auth signup/recovery abuse checks | Existing Supabase Auth configuration has not been changed or proved protected | Separate Supabase Auth CAPTCHA/rate-limit review and matching client integration; intake Turnstile does not protect these endpoints |
| Confirmation/recovery email | Code prepared; no real external delivery evidence | Owner approves sender address/domain; configure SMTP and allowed redirects, then verify genuine delivery through an authorized flow |
| Owner notifications | Existing transactional outbox and generic alerts documented | Verify notification delivery with permitted fixtures; messages/visits do not currently send email/SMS |
| Operations | One active provider, manual qualification, pause control | Name support contact/process, review retention/privacy copy and coverage before opening |
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

## Evidence and limits

- `npm test`: 55 tests pass, including 12 new challenge checks and protected-form
  retry coverage. No real challenge token, account, lead, upload, email or message
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
