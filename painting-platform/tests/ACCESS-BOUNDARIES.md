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
expiration. Prior rollback SQL evidence remains separate. All work here is saved
in tests/runbook/report code only; the private Site and backend are unchanged.
