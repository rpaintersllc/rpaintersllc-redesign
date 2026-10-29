# BUZZIE private-pilot verification — October 28, 2026 (America/New_York)

## Verified this session

- Supabase `ocmgrgvzhuhyigaddhue` reports ACTIVE platform-api v18. Its retrieved `index.ts` is byte-for-byte equal to the local tested source. No API replacement was necessary or attempted this session.
- The published handler verifies the bearer with Auth, matches its subject to that verified account, and checks `session_id` through the service-only `platform_active_session` RPC. Homeowners retain email confirmation; contractors retain company membership checks.
- Local verification: 13 browser modules link; 458 mocked Node/DOM tests pass. This is simulated transport evidence, not real browser login/logout evidence.
- Repeated the existing 11 active-session SQL assertions in a transaction: own/foreign/missing/expired/future/deleted synthetic sessions and grants. ROLLBACK completed; follow-up found zero fixture users and zero idle transactions. These are real database calls with synthetic identities, not Auth-issued session tokens.
- Live HTTP: provider discovery 200; homeowner without/invalid bearer 401; contractor without/invalid bearer 403; disallowed origin 403; preflight 204. All seven checks passed. `scripts/live-access-smoke.mjs` repeats read-only acceptance/rejection and preflight checks without signing in or writing records.
- The owner's existing contractor browser session successfully refreshed the private project workspace. This is an actual authenticated positive control. No logout, password change, project write or contact action was performed.
- Live provider configuration: intake verification required=true/available=true; Auth verification required=false. Configuration alone does not prove legitimate CAPTCHA completion.
- Submitted clearly marked synthetic company-interest rejection probes only: absent proof returned 400 with security-check guidance; invalid proof returned 403 with verification failure. Follow-up SQL found zero matching interest records. No customer request was created and no notification was sent by these checks.
- Security advisor: no ERROR findings; leaked-password protection remains a WARN. RLS-without-policy INFO findings reflect server-only tables; no client permission was relaxed.

## Still required before public release

1. Real homeowner login, allowed reads and server logout followed by denial; real contractor logout/revocation acceptance. The existing owner's active session was not revoked for testing.
2. Genuine company-interest success and token expiry/replay remain open. The preceding GitHub report `operations/TURNSTILE-ACTIVATION-2026-10-28.md` already records a successful genuine owner-authorized project request, its saved receipt, database confirmation and delivered owner email. That prior evidence is retained and was not repeated or counted as a new test here. Native Auth CAPTCHA remains a separate coordinated setting; client compatibility is already prepared/published per `ACCOUNT-CAPTCHA-COMPATIBILITY-2026-10-28.md`, but native activation and legitimate sign-in are pending.
3. Current branded SMTP configuration, approved sender/domain, real confirmation and completed recovery with authorized test accounts. The existing SMTP dashboard tab repeatedly failed browser inspection; no current SMTP state is claimed. October 23 owner-only alert/recovery and October 28 owner-only Turnstile request-alert delivery are historical evidence, not new delivery tests. They use development/default senders and do not establish external homeowner delivery.
4. Full homeowner/contractor browser journey, actual photo storage, messages, visits, quotes and won/lost completion in desktop and mobile with authorized test records.
5. Only after the above: company approval/administration, coverage and exclusive assignment. No new contractor was activated.

The Site remains a private pilot. No Site publication, appearance change, public sharing, service purchase, billing activation or real-data deletion was performed. No runtime setting, Lead Engine integration or secret was changed. GitHub was ahead of the initial local checkout. Its published session/Turnstile/client-compatibility evidence was reviewed before this update; v13/deployment-blocked and v14 version labels are historical and superseded by the current v18 read-back.
