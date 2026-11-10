# Turnstile intake activation — October 28, 2026

## Active private-pilot configuration

Cloudflare widget BUZZIE — private pilot uses Managed mode, no pre-clearance,
and only r-painters-projects.jessicuriel27.chatgpt.site as an allowed hostname.
The existing Lead Engine widget and TURNSTILE_SECRET_KEY were not changed.

The current Buzzie key pair is saved as PLATFORM_TURNSTILE_SITE_KEY and
PLATFORM_TURNSTILE_SECRET_KEY in Supabase Edge secrets. PLATFORM_REQUIRE_CHALLENGE
was then set to true. No secret values or capability links are included here.
A masked UI read initially saved a redacted placeholder; the fail-closed 503
probe detected it, and it was replaced with the actual current widget secret
through the authorized UI. Subsequent invalid-token probes returned 403.

GET providers reports intake_challenge.required=true and available=true.
This is supported by genuine rejection and positive browser evidence below,
rather than treated as proof on its own. platform-api remains v14; no code/Site
deployment or public-audience change was needed.

## Genuine verification

- provider-interest without a token: 400, Complete the security check before submitting.
- provider-interest with an invalid token: 403, verification rejected.
- create without a token: 400, Complete the security check before submitting.
- create with an invalid token: 403, verification rejected.
- The rejected provider probes left zero platform_provider_interest rows for
  buzzie-test@example.invalid.
- Edge displayed Security check complete automatically. No interactive CAPTCHA
  was solved or bypassed. A genuine three-step request was submitted using the
  authorized owner contact, clearly labelled BUZZIE TEST — Turnstile verification.
- The request receipt displayed Your request is saved. Project
  72cbf1f5-34f7-4af1-8270-c5cc00aeb62a was confirmed by a read-only database query.
- Its guest project and conversation loaded successfully. No photos, messages,
  visits, estimates or later status changes were created in this run.
- The alert was accepted and independently found in the owner Gmail inbox at
  18:39:04 UTC (2:39:04 PM Eastern), subject New BUZZIE painting request, with the
  correct contractor project link. Sender remains the existing Resend development
  sender, not a branded Buzzie SMTP sender.

The test project is retained for owner review and is not a genuine customer.
Four API rejection probes and one genuine request are new evidence in this run.
The existing 458 mocked tests / 11 SQL session assertions belong to the preceding
session-gate work and were not rerun or counted as new tests here.
The screenshot ../tests/evidence/turnstile-live-2026-10-28.png shows the empty
live request form with Security check complete and contains no contact/capability.

## Remaining gates

Native Supabase Auth CAPTCHA remains disabled, and auth_challenge.required=false.
It affects the shared Auth service, not just platform-api. The existing
lead-engine/web/admin.js password sign-in does not submit captcha proof; enabling
native enforcement now could block that separate admin. Coordinate compatibility
or isolation before native activation, preserving the owner's instruction not to
break the Lead Engine integration.

No native CAPTCHA, SMTP, billing, contractor activation or Site audience setting
was changed. Custom SMTP/sender, external homeowner delivery, completed account
registration/recovery/logout, token replay/expiry in a genuine browser, company
interest success, physical-mobile and full authenticated journeys remain gates.
