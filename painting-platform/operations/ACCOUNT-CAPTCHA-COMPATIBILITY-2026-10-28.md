# Shared account CAPTCHA compatibility — October 28, 2026

## Completed

Created a dedicated Cloudflare Managed widget named
BUZZIE & R Painters — account security. It allows only:
- r-painters-projects.jessicuriel27.chatgpt.site
- rpainters-lead-engine.jessicuriel27.chatgpt.site

Its public site key is 0x4AAAAAAFp-U9kwaaKp86uD.
No secret is committed here. Existing intake widgets and secrets were unchanged.

The Lead Engine sign-in now renders this dedicated widget, requires proof before
Auth dispatch and supplies gotrue_meta_security.captcha_token. It resets proof
after attempts, blocks duplicate submits, handles expiry/error/native rejection,
and refuses a malformed successful Auth response without an access token.
The public intake form still uses its original, separate widget and configuration.

43 Lead Engine mocked tests pass, including 7 new CAPTCHA sign-in regressions and
the updated existing discovery dashboard walkthrough. Syntax checks passed.
The new cases cover missing/expired/error proof, native payload placement,
duplicate dispatch, rejected proof recovery and malformed Auth success.
No real password sign-in, logout or email request was made in this run.

## Published

The owner-private Lead Engine Site was opened through the Sites source workflow.
Its starting admin.js/admin.html matched the GitHub baseline. Four production
files were changed (admin.js, admin.html, config.js, new auth-check.js).
Source commit 4f3010bdac8c8ac68ad8885d58380c7e3ca99338 was packaged and pushed.
Sites returned succeeded for private deployment appgdep_6ae2442c66008191a48a8b6d59285611.
Live URL: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Audience stayed owner-only. No public opening, discovery-source edit or billing.

## Not activated / blocked

The connected browser stopped responding during the next Supabase tab claim.
A later tab-list request also failed to return; those execution waits were
terminated without attempting native settings changes or an alternate browser.
No genuine browser rendering/sign-in evidence is claimed for this release.

Native Supabase Auth CAPTCHA remains OFF. Buzzie's AUTH_TURNSTILE_SITE_KEY has
not yet been configured. Account protection is therefore not finished. Intake
Turnstile remains enabled and verified in the preceding activation report.

## Resume order

1. Reconnect the browser and verify the published Lead Engine login widget.
2. Save the dedicated account widget public key as AUTH_TURNSTILE_SITE_KEY in
   this isolated Supabase project's Edge secrets; confirm Buzzie account/pro
   pages render it and all relevant live clients use the native proof field.
3. Read the dedicated widget's current secret through Cloudflare's UI into
   memory only; configure native Supabase Auth Turnstile with that secret last.
4. Prove native rejection without/with invalid proof on sign-in/signup/recovery,
   and a legitimate authorized flow. Do not claim an invalid-password reply is
   a successful sign-in. Do not change real passwords.
5. Keep both Sites private. SMTP/sender and external homeowner delivery remain
   separate launch blockers.

If compatibility must be rolled back before native activation, prior Lead Engine
source is 80fd94335baa487176b6daf66fc2d210b19935cc. After native activation, never
remove client proof support independently: coordinate account CAPTCHA settings
and all clients rather than leaving an unusable login.
