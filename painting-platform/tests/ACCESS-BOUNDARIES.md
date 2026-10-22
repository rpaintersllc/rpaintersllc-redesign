# Account / contractor access evidence

Reviewed October 22, 2026. `access-boundaries.test.mjs` exercises the actual
`makePlatformHandler` with an entirely synthetic fetch implementation. No live
Auth, Storage, RPC, notification or customer request is made.

The fixture contains two projects with different owner and business IDs. Its
PostgREST-shaped store applies the ownership/business filters actually supplied by
the handler. Omitting a filter exposes synthetic rows to the test, instead of the
stub unconditionally denying every request. Positive controls establish that the
owning homeowner can read/upload and an approved contractor can list its own
project and sign its ready photo.

| Boundary | Checked behavior |
| --- | --- |
| Confirmed homeowner guessing another project ID | Lookup, upload, conversation, message, visit request and visit update return 404; only Auth and the owner-scoped project lookup occur. No photo reservation/sign/upload, message/visit read or mutation RPC follows. Submitted owner/account IDs do not replace the verified Auth user. |
| Unconfirmed homeowner upload | Stops after Auth, before database, slot reservation or Storage. |
| Approved member selecting a different company | Pro list, status, review, availability, conversation, message and visit decision return 403 before project access or writes. Membership lookup uses the verified member ID. |
| Approved member using its own workspace with another company's project | Conversation/message/visit decision return 404 after the project lookup scoped to its approved business. |
| Authorized homeowner / contractor | Access is possible through the same fixture; ready photos receive a synthetic signed URL and homeowner photo objects omit raw storage paths/access hashes. |

All **20 matrix tests pass**. A separate disposable copy with only the homeowner
ownership filter removed fails **seven checks**, including all six foreign-homeowner
routes. No weakened code is committed or deployed. Existing tests cover other
capability, role and revision checks; this matrix is not a complete audit.

Run the matrix alone or through the complete local verifier:

```sh
node --test painting-platform/tests/access-boundaries.test.mjs
npm run verify --prefix painting-platform
```

The complete verifier links 12 browser modules and passes 217 mocked tests.

## Read-only isolated-project posture report

Run the complete `operations/access-posture.sql` as an authorized operator in
project `ocmgrgvzhuhyigaddhue`. It returns one metadata-only row under a read-only
transaction, a five-second timeout and ROLLBACK. No function bodies, Auth users,
customer rows, storage objects or secrets are queried. It does not invoke the
listed application functions. Preserve both arrays if recording evidence.

Expected private tables: exactly six named rows, RLS true, both client CRUD flags
false. Expected server functions: exactly seven named rows, each with one overload
and both client execute flags false. A missing/extra overload or changed grant
requires review; do not add permissive policies to silence intentional server-only
RLS notices. This report deliberately covers these selected surfaces, not all
schemas, column-level grants, Storage policies or database functions.

The October 22 live metadata check matched those expectations. Security advisors
were reviewed: the existing 16 RLS-without-policy informational notices correspond
to intentional server-only tables; leaked-password protection remains the known
open warning. No setting or permission was changed.

References:
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Limits: mocks validate the gateway's authorization/dispatch boundaries, not the
live PostgREST query engine or RPC implementations. Metadata checks validate the
selected grants/RLS flags, not an end-to-end JWT/browser journey or signed URL
expiration. The self-contained rollback evidence below is separate. All work here is saved
in tests/runbook/report code only; the private Site and backend are unchanged.


## Self-contained live RPC rollback fixture

`tests/rpc-isolation.sql` is the preferred repeatable RPC check for the isolated
project `ocmgrgvzhuhyigaddhue`. It avoids the pre-existing synthetic project and
pilot-company availability changes used by historical `accounts.sql` and
`contractor-controls.sql`; those older files are historical, not the default replay
procedure. The new script does not invoke the public intake endpoint or
`platform_create_project`.

Run the **entire file** through the authorized SQL connector, including ROLLBACK
and the final aggregate query. Review the two allowlisted lead-trigger bodies
against `lead-engine/003-notifications.sql` and migration
`20261017141004_homeowner_platform_pilot.sql` before replay if the database changes:
notifications only insert into the outbox, and status changes only insert an event.
The script aborts before inserts for any other noninternal row trigger on its
fixture tables. The trigger allowlist does not detect edits to an existing
function body. Do not disable triggers, claim queue work or call a dispatcher.

Each run generates fresh UUIDs and reserved example.invalid email addresses. Both
companies remain `active=false`; only one synthetic company's accepting flag is
changed. No pre-existing account/project/company row is selected for modification.
Generated notification rows remain uncommitted and cannot be seen by a worker in
another transaction. No object is uploaded and no Auth email is requested.

| RPC boundary | Explicit checks |
| --- | ---: |
| Ownership: wrong key/email, unconfirmed account, unchanged denied claim, matching confirmed claim, idempotency, no reassignment | 7 |
| Reviews: foreign actor/project, owner save, stale revision preservation, staff save | 5 |
| Availability: staff/foreign owner denial, stale expected value, authorized inactive-company update | 4 |
| Status: foreign company denial, own-company success | 2 |
| Photo metadata: wrong key, unsupported MIME, valid pending reservation | 3 |
| Messages: wrong key/company, authorized insert, stable retry, conflicting retry preservation | 5 |
| Visits: authorized request, cross-project denial, homeowner confirmation denial, contractor confirmation, homeowner cancellation, terminal-state protection | 6 |
| Foreign fixture unchanged; generated outbox remains unclaimed | 2 |
| **Total** | **34** |

The October 22 run completed every explicit `IF ... IS DISTINCT FROM true` check
without an exception. The transaction-local report returns `checks_passed=34`;
connectors that expose only the last query show the post-ROLLBACK report instead.
That final report returned `remaining_fixture_leads=0`,
`remaining_fixture_users=0`, `remaining_fixture_businesses=0`. All three counts
must remain zero. On any SQL error, issue ROLLBACK before further investigation
and run the final aggregate query separately; never commit the fixture.

The initial attempt stopped at its own status assertion because a state subquery
in the same expression could execute before the mutating function. The successful
fixture calls the write first, then inspects persisted state in a separate
statement. This was a test-order issue, not evidence of a product defect. Both
attempts were reverted and their post-rollback counts were zero.

Limits: calls run as the authorized database operator, not a homeowner JWT.
Claiming checks confirmed matching email plus capability; review and availability
RPCs check membership/role internally. Status and conversation RPCs check supplied
business/project scope and depend on the gateway to verify the actual member
first; this test does not claim they authenticate a submitted business UUID.
Photo checks cover metadata only, not Storage upload/download or URL expiry.
No actual email delivery, parallel database race, capacity/rate-limit boundary,
full browser journey or complete security audit is established. Application code,
schema, grants, runtime settings and the private Site were unchanged.
