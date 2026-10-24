# Server session-revocation prerequisite

## Implemented and observed

The isolated project ocmgrgvzhuhyigaddhue has migration
20261023210328_active_account_session_gate.sql. apply_migration returned success
on October 23, 2026. A subsequent read of schema_migrations and
pg_get_functiondef confirmed the applied name/version and function body.

platform_active_session(account_id uuid, session uuid) returns a boolean for
a matching auth.sessions row whose not_after is null or in the future.
It uses a fixed empty search_path and SECURITY DEFINER because service_role
has no direct auth.sessions SELECT privilege. It exposes no auth rows.
Read-only privilege checks confirmed anon=false, authenticated=false and
service_role=true for EXECUTE. No broader table grant was added.

## Not active in request authorization

platform-api remains v13. Its deployed source was read back and does NOT call
this RPC. Existing bearer access still uses Supabase Auth user verification
without this additional session-presence check. This migration alone does not
prevent reuse of an unexpired access JWT after logout. No frontend publication,
audience, membership, provider or secret change was made.

Supabase documentation reviewed for the design:
https://supabase.com/docs/guides/auth/sessions
https://supabase.com/docs/guides/auth/jwt-fields

The server must validate the bearer with Auth before trusting any claim.
It may then extract the UUID session_id and pass Auth's verified user id to
this service-only RPC. Client-submitted user ids, user_metadata and a decoded
JWT alone must never authorize a request.

## Evidence limits and recovery

tests/session-gate.sql is a prepared rollback-only fixture, NOT a completed
database regression. Execution attempts were interrupted without a returned
result; do not infer success, cleanup or a passing assertion count. Before
retrying, inspect database activity and check for incomplete synthetic fixture
transactions through authorized operational tools. Do not select real tokens
or user secrets. No customer endpoint or email test was submitted.

The local execution environment subsequently failed to start with
exec-server rejected request: No such file or directory. Experimental API
changes and local regression results were not durably recovered, and are not
part of this commit. The production API was deliberately not replaced with
an unverified reconstruction.

## Next bounded step

1. Restore a working Node 24 execution environment and read the branch afresh.
2. Resolve any incomplete fixture execution before rerunning the SQL test.
3. Add a shared per-request verified identity/session check for homeowner and
   contractor routes. Preserve the homeowner email-confirmation requirement
   and the existing contractor membership policy.
4. Add raw-handler mocks for revoked/foreign/missing sessions, Auth rejection,
   malformed claims, failed session queries, active access and repeat-request
   revocation; keep all existing route/isolation tests passing.
5. Save exact tested code with an expected-head lease, then deploy only the
   isolated platform-api and verify source read-back. Do not change Site audience.

A successful server logout must remove the session before subsequent requests
can be rejected this way. Requests already in progress, existing signed photo
URLs (up to 30 minutes), and independent guest capability links need separate
acceptance/limits. Session presence is not enforcement of configured inactivity,
single-session or maximum-lifetime policies. No real logout/browser acceptance
or email delivery is claimed.
