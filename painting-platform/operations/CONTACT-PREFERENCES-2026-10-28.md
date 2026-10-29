# Contact preferences — private pilot

## Implementation

The homeowner's final request step now asks for a preferred method (phone call, email or either) and an optional Eastern-time window. Times are preferences, not appointments. The consent text reflects the selected method. Native HTML validation requires a method on the new form; old API clients remain compatible with absent/null values.

`platform_projects.contact_method` and `contact_window` are nullable, constrained fields. The existing server-only creation RPC validates/persists them atomically with the request. Duplicate request keys retain the first saved preferences. Existing rows remain NULL; no legacy preference is invented. Creation still uses the same rate limits, business coverage, assignment, notification queue and guest/account access rules.

The API returns persisted preferences only through the same authorized project lookup and company-scoped contractor list. Homeowner and contractor views render shared safe labels. Contractor contact links respect email-only/phone-only preference; the other detail remains plain text. Older requests display Not provided. Private review guidance now tells the operator to confirm a two-way reply, authority, scope, coverage and timing before marking qualified. Anti-bot success is not contact/identity verification.

This does not add SMS, automated outreach, a call scheduler, verified-phone claims, structured qualification reasons, a source-to-sale report or contact-preference editing. Those remain separate work.

## Verification

- 14 browser modules link; 489 mocked tests pass (31 additional checks over the preceding 458).
- API cases cover valid combinations, malformed/unknown preferences, legacy omissions, persisted lookup fields and no client-controlled verification claim. Browser/DOM checks cover intake, validation focus, contractor contact links, stored homeowner preferences and access-denial cleanup.
- A pre-release rolled-back transaction containing the migration plus 40 synthetic SQL assertions passed. The same 40 assertions passed again against the applied migration, with ROLLBACK.
- Applied Supabase migration: 20261029015521_contact_preferences. No real customer record was created by these SQL tests; temporary notification queue inserts were transactional and rolled back.
- Starting live platform-api v18 and hosted Site source matched the preceding GitHub baseline before edits. Logo and theme.css are unchanged.

## Release status

Published platform-api v19 is ACTIVE and its retrieved source matches the tested implementation exactly. Its manual authorization/active-session gate and verify_jwt=false are retained. Seven read-only live HTTP checks passed: discovery 200, missing/invalid homeowner bearer 401, missing/invalid contractor bearer 403, foreign origin 403, preflight 204. Intake Turnstile remains required/available; native account CAPTCHA remains off.

The owner-private Site deployed successfully from source commit 5713bf6dbc0f9a31152fbe809229a17043f17e22, deployment appgdep_6ae2a84754e4819196511e1da7d935a9. Owner-only access with zero external visitors was confirmed before release. New selectors, Eastern-time wording and selected-preference consent were observed in the real Edge form.

A genuine, explicitly authorized guest test request used the approved owner contact, label BUZZIE TEST — contact preferences, and project d8ce1fc6-711f-4d1c-ab74-5eb4a31ca86f. The managed Turnstile check completed automatically without an interactive challenge. The receipt displayed saved; read-only SQL confirmed contact_method=email, contact_window=weekday_morning, contact_verified=false and exclusive assignment to the pilot business. The reopened private project rendered Preferred contact: Email · Weekday mornings, 9 AM–noon Eastern. The generic receipt did not name the assigned company. No photo, message, visit or quote was created during this test.

Notification delivery was independently confirmed in owner Gmail, message 1a18563b88e37ec3 at October 28, 2026, 10:01:06 PM Eastern (02:01:06 UTC October 29), with the matching project link. Sender remains the existing Resend development sender; this does not close branded SMTP/external-homeowner Auth delivery gates.

The labelled test request is retained for owner review and is not a customer or conversion. Contractor rendering/contact-link behavior was verified by mocked DOM tests; a new authenticated contractor browser walkthrough for this field is not claimed. No mobile acceptance is claimed.

Follow-up SQL found zero temporary fixture projects, businesses, queued notifications or idle transactions. Post-migration security advisories were unchanged: 17 server-only-table RLS INFO findings and the existing leaked-password-protection WARN, no new ERROR. Screenshot: tests/evidence/contact-preferences-live-2026-10-28.png.

## Recovery

The previous API source is retained in GitHub commit 68dd26e61564b44af9359d1cd1e749f81c9f6b8a at painting-platform/supabase/functions/platform-api/index.ts. v18 was also retrieved and retained before edits. Restore that API if necessary; keep the additive nullable columns and new RPC accepting legacy payloads so captured preferences are preserved. Never drop data to roll back this release. Keep verify_jwt=false/manual authorization and the active-session gate intact.

The preceding private Site source commit is 9d79769ba566263a9a2f095e130a149294f9ce10. No audience, runtime secret, Auth setting, Lead Engine integration, contractor membership or billing change is part of this release.
