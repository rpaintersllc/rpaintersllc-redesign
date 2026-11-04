# Current activation evidence

The October 23 pending notes below are historical. Intake Turnstile is now active,
with genuine request/email acceptance documented in
[October 28 activation](TURNSTILE-ACTIVATION-2026-10-28.md). The
[latest verification](PILOT-VERIFICATION-2026-10-28.md) repeated missing/invalid
proof rejection without creating a record. Native account CAPTCHA remains off;
[client compatibility](ACCOUNT-CAPTCHA-COMPATIBILITY-2026-10-28.md) is published.

# BUZZIE Turnstile activation — October 23, 2026

## Completed

- Created `BUZZIE — private pilot` in the owner's existing Cloudflare account.
- Managed mode, no pre-clearance, single allowed hostname:
  `r-painters-projects.jessicuriel27.chatgpt.site`.
- Kept `R Painters Lead Engine - Preview` unchanged.
- Saved only the new public site key as `PLATFORM_TURNSTILE_SITE_KEY` in the
  existing Supabase project's Edge Function settings.
- Patched platform-api to use `PLATFORM_TURNSTILE_SITE_KEY` and
  `PLATFORM_TURNSTILE_SECRET_KEY`, separating it from the existing shared
  `TURNSTILE_SECRET_KEY` used by legacy Lead Engine intake.
- 372 platform tests pass. The new regression proves that legacy keys cannot
  satisfy Buzzie configuration or cause a Siteverify call when Buzzie keys are absent.
- Deployed platform-api v10; read-back equals the tested source. Existing
  verify_jwt=false/manual authorization is unchanged. The prior live v8 source
  matched the local baseline before the narrowly scoped environment-name change.
- Provider discovery still reports intake required=false and Auth required=false;
  no protected submission or real challenge success is claimed.
- Native Auth protection was inspected in the dashboard and is disabled.

## Pending owner confirmation for the browser secret transfer

The newly created widget secret is held only in browser session memory. It was
not printed, written to disk/GitHub, or entered into Supabase. The browser policy
requires specific authorization to transfer a secret between services. Ask the
owner to authorize storing this new Turnstile secret in Supabase's encrypted
`PLATFORM_TURNSTILE_SECRET_KEY` setting for Buzzie server-side verification.
Do not ask the owner to paste the secret into chat.

After authorization: save the secret through the protected dashboard, enable
`PLATFORM_REQUIRE_CHALLENGE=true` last, and confirm provider discovery reports
required=true/available=true with the correct public key. Confirm missing/invalid
proof is rejected without creating a lead. Keep the Site owner-private.
An actual interactive CAPTCHA attempt needs action-time confirmation under the
browser's CAPTCHA policy. Never use Cloudflare test secrets as live protection.

## Native Auth is a separate coordinated step

`AUTH_TURNSTILE_SITE_KEY` has not been set and native Auth CAPTCHA remains off.
Review all sign-in clients sharing this project (including the older Lead Engine
admin) before enabling project-wide CAPTCHA to avoid blocking those logins.
Then configure the public key, matching native Auth secret, and perform genuine
sign-in/signup/recovery checks. This document does not claim account protection.
