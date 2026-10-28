# Server session-revocation gate

## Active October 28, 2026 — platform-api v14

The deployed platform-api verifies the exact bearer with Supabase Auth, checks that
its decoded sub matches the verified account, and passes its UUID session_id
and verified account ID to the existing service-only platform_active_session RPC.
Both homeowner and contractor authorization share this check per request.
Homeowners still require confirmed email; contractors retain membership policy.
False or malformed session results deny access. Query/network failures fail closed.
No user_metadata or client-supplied actor is used for authorization.

## Verification

Node 24 verification: 458 passing tests, including 27 new raw-handler tests.
24 of the 27 new checks fail against the preceding production source.
Older route suites explicitly stub the active-session RPC and use synthetic JWTs;
the new session-revocation suite uses the raw handler without this bypass.
Tests cover removed sessions across 14 routes, Auth rejection, foreign subject,
malformed claims, failed/non-boolean queries, active access, email policy and
revocation between requests.

The first SQL retry returned an expired requestState error; the next execution
returned all 11 assertions passed and ROLLBACK completed. session-gate.sql tests
active, foreign, missing, expired, future and deleted sessions plus client grants.
A separate post-run query confirmed zero fixture users, zero idle transactions,
anon/authenticated EXECUTE false and service_role EXECUTE true.
No real account, password, message, visit or customer record was modified.

## Release and limitations

Before replacement, live platform-api v13 read-back matched the prior baseline.
Deploy only this isolated project's platform-api, preserving verify_jwt=false
because it authenticates requests itself and supports public/guest routes.
After explicit user authorization, deployment succeeded: platform-api v14 is ACTIVE.\nA fresh get_edge_function read-back matched the tested GitHub source exactly.\nRollback source remains in GitHub at commit\n914bc829f3e9566efe641b5f3e988a18f04dc226 (platform-api/index.ts); the prior\nlive v13 files were also retained in session memory before replacement.\n\nFour genuine post-deploy HTTP checks passed: providers 200, unauthenticated\nhome-projects 401, unauthenticated pro-list 403, foreign Origin providers 403.\nIn the connected Edge browser, the existing authorized contractor session\nsuccessfully refreshed projects (Projects refreshed.) and read the labelled\nOctober 23 test conversation (Conversation up to date.). No message, visit,\nestimate, status, password or customer data was changed.\n\nTurnstile remains off: providers reports intake/auth required=false and blank\npublic keys; native Auth CAPTCHA is visibly disabled. Cloudflare requires a\nfresh user sign-in, so no secret transfer or activation was attempted. Custom\nSMTP is visibly disabled in Supabase; sender and external delivery remain gates.\nThe attempted 390px viewport override did not apply to the contractor tab\n(measured 1528px); it was reset. No new mobile verification is claimed.
Site files, audience, billing, Turnstile and email settings are unchanged.

A fresh login/logout and revoked-token browser acceptance remain pending. Successful server logout
must remove the session before later requests are denied. A request already
in progress can finish, signed photo URLs remain valid up to 30 minutes, and
guest capability links remain a separate access mechanism. Session presence does
not enforce configured inactivity or maximum-lifetime policies.

Documentation reviewed: https://supabase.com/docs/guides/auth/sessions
Changelog reviewed through October 23; upcoming legacy TLS cipher removal does
not change this session API contract.
