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

Database applied; tested API and Site release pending. Do not claim the hosted form is active until deployment and read-back are recorded below.

## Recovery

The previous API source is retained in GitHub commit 68dd26e61564b44af9359d1cd1e749f81c9f6b8a at painting-platform/supabase/functions/platform-api/index.ts. v18 was also retrieved and retained before edits. Restore that API if necessary; keep the additive nullable columns and new RPC accepting legacy payloads so captured preferences are preserved. Never drop data to roll back this release. Keep verify_jwt=false/manual authorization and the active-session gate intact.

The preceding private Site source commit is 9d79769ba566263a9a2f095e130a149294f9ce10. No audience, runtime secret, Auth setting, Lead Engine integration, contractor membership or billing change is part of this release.
