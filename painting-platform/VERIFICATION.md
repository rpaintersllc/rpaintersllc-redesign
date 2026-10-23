# Repeatable local launch verification

Use Node 24. Validated October 22, 2026 with Node 24.19.0.
From the repository root, install the locked development dependencies and run:

```sh
npm ci --prefix painting-platform --ignore-scripts
npm run verify --prefix painting-platform
```

The verify command stops with a nonzero exit code at the first failed stage:

1. Parse and link all regular browser JavaScript files under `web/` using Node's
   VM module API. This catches JavaScript syntax errors, missing static imports,
   missing named exports, nonlocal imports and imports outside `web/`. Linking
   never evaluates application code: it does not initialize Auth or call APIs.
2. Run the explicit list of `tests/*.test.mjs` using the Node test runner. Tests
   exercise the API with mocked fetch responses and the UI with synthetic DOM
   fixtures. The live integration script `tests/live-pilot.mjs` and rollback SQL
   files are deliberately outside this list.

No deployment, database migration, live integration test or notification worker
is started by this command. Service credentials and real customer data are not
required. Installing dependencies uses the package registry; the mocked tests
are not a network-isolation boundary. Existing responsive-fixture tests create
scratch directories under `/workspace/`, so that directory must be writable in
the current managed test environment.

Evidence: **12 browser modules linked; 217 tests passed**. Five new checker tests
use temporary broken graphs to prove missing files, invalid exports, syntax
errors and outside-directory imports fail. A valid cyclic graph containing a
throwing top-level statement passes, proving application code is not evaluated.
The VM module API requires the experimental flag; the wrapper supplies it.

Scope: static JavaScript imports only. Dynamic import targets, CSS/layout,
provider runtime behavior, genuine email delivery, active abuse enforcement,
physical mobile devices and screen readers remain separate review items.
Passing this command is development evidence, not public-launch approval.

Before publishing an application change, also run `git diff --check`, compare
changed hosted files to the branch baseline and use the Sites source workflow.
The existing Site must remain owner-private. This verifier does not publish it.

The existing GitHub discovery workflow is separate and performs discovery-source
checks. This change does not enable or execute any new hosted Actions workflow.

VM API reference: https://nodejs.org/docs/latest-v24.x/api/vm.html

Notification diagnostics have a separate read-only SQL regression described in
[operations/README.md](operations/README.md). On October 22, its five checks passed
against synthetic CTE relations in the isolated database; both real aggregate
reports also executed successfully without dispatch or writes. This SQL check is
manual and is not run by `npm run verify`; the 142-test snapshot in that operations
report predates the account-mutation tests.

Account-mutation evidence: thirteen UI cases cover link/password duplicate events,
newer input, stale-session feedback, retry, both token acquisition boundaries and
saved-link/failed-list recovery; two helper cases cover renewal/obsolete tokens.
Nine of the first eleven UI cases fail against the prior account.js. All fifteen
new cases pass with the fix. No live Auth write or email was exercised.

Email-link evidence: twelve new UI cases cover manual confirmation/recovery and
URL callback adoption, session changes before/after adoption, failed list loads,
newer pasted links, normal focus/wording and retry. Nine fail against the previous
account.js. An existing callback race assertion now verifies newer feedback is
preserved. All 169 tests pass; no live confirmation/recovery was performed.

Auth-action evidence: eighteen new cases cover sign-in, signup and recovery across
logout/new login, edited passwords, post-adoption logout, conditional signup
feedback and ordinary retry. Fifteen fail against the previous account.js. The
current complete run passes 187 tests. Requests are mocked; no live account or
email delivery evidence is inferred.

Synthetic browser evidence: `tests/ACCOUNT-BROWSER-QA.md` records account Enter
submission, recovery focus and error-state checks plus the 320/390/768px signed-in
layout regression/fix. Three boundary tests validate its network stubs/CSP and
unchanged application module. The current verifier passes 190 tests. The fixture
output must never be deployed; production CSS is the only hosted change.

Account focus evidence: seven mocked cases pass; three fail against the prior
account.js/HTML. Chromium confirmed password Enter at 390px and button Enter at
320px focus the identity heading and Tab reaches Refresh projects. Recovery at
390px still focuses new-password. The current verifier passes 197 tests; no real
Auth request or screen-reader claim is inferred.

Access-boundary evidence: twenty new mocked API cases pass with both authorized
and unauthorized controls. A separate source copy lacking the ownership filter
fails seven checks. `tests/ACCESS-BOUNDARIES.md` records the matrix and the live
read-only selected table/function grant report. The complete run passes 217 tests.
No application behavior was changed or deployed for this evidence update.


Initial live RPC evidence: `tests/rpc-isolation.sql` separately passed 34 explicit checks
on October 22 against fresh, uncommitted synthetic fixtures in the isolated pilot.
The final ROLLBACK report showed zero fixture leads, Auth rows and companies.
`tests/ACCESS-BOUNDARIES.md` documents replay, trigger review, positive controls,
operator-vs-JWT scope and recovery after a SQL error. This SQL is intentionally
outside the local 217-test command; no live intake, Auth API, Storage upload or
notification dispatcher was used. No application or Site change was deployed.


Current live boundary evidence: the same self-contained SQL transaction now passes
65 checks (31 added), including photo metadata capacity/expiry, rolling-day and
total message caps, visit dates/history limits and later pipeline preservation.
The October 22 replay reverted all fixtures; final lead/user/company
counts were zero. The local verifier still links 12 browser modules and passes
217 mocked tests. These counts describe separate suites. No parallel race,
Storage cleanup, native CAPTCHA/rate-limit enforcement or delivery is inferred.


Upload cleanup evidence: ten new synthetic gateway tests pass, including partial
object creation before a failed upload response, independent object cleanup after
metadata HTTP/transport failure and a deliberate retry with a new reservation.
Four fail against the prior API source. The current local run links 12 browser
modules and passes **227 tests**; see tests/UPLOAD-CLEANUP.md. The fix is saved in
branch source only at that checkpoint; its subsequent isolated API version 8
publication is recorded below. Genuine Storage cleanup remains unverified; no
live object was uploaded or deleted.


Isolated API release evidence (October 22): platform-api version 8 is ACTIVE and
read-back source exactly matches the tested upload cleanup fix at d4a895d.
Version 7 matched the preceding baseline before publication; JWT behavior stayed
unchanged. A fresh local run passes all 227 tests and links 12 browser modules.
Provider read, rejected origin, missing-project upload rejection and preflight
passed before/after publication (200/403/401/204). No real Storage write/delete,
customer mutation, Auth write or email dispatch was exercised. See
tests/UPLOAD-CLEANUP.md for the exact version, fingerprints and remaining limits.


Confirmation focus evidence: fourteen new mocked cases pass, five fail against
prior account.js, and two additional browser-fixture boundary cases pass. The
current full run links 12 browser modules and passes **243 tests**. Chromium
verified selected signup outcomes and consent/minlength validation, callback
confirmation at 320px and manual pasted-link Enter at 390px. Confirmation now
focuses the visible heading and Tab reaches Refresh projects. Only production
account.js was deployed owner-private; fixtures stay local. ACCOUNT-BROWSER-QA.md
records evidence and limits. No genuine Auth/email/password mutation was tested.


Recovery focus ownership: ten additional mocked cases pass; five fail against the
previous account.js. Manual/callback completion preserves another field chosen
during verification/list loads and a newer recovery-link draft; ordinary recovery
still focuses new-password. Older adoption/callback fixtures now explicitly model
the initiating focused control. Current verifier: 12 linked browser modules,
**253 passing tests**. Only production account.js was published owner-private.
This is mocked focus evidence, not a new browser/device walkthrough or genuine
recovery/email/password verification.


Coverage/assignment follow-up (October 22): `routing.test.mjs` adds ten injected-
fetch gateway cases; the full command links **12 modules and passes 263 tests**.
Separately, all **16 operator SQL routing assertions** passed in isolated Supabase;
ROLLBACK left **0 fixture leads, 0 companies and 0 projects**. RPC/trigger hash and
trigger-inventory guards ran before insertion; no real company row or public
intake/Auth/Storage/worker endpoint was changed or called. Paused/deactivated/
changed-coverage retries retained assignment, and new denials did not fall back.
See [tests/ROUTING.md](tests/ROUTING.md) for safe replay and proof limits. Tests/docs
only: no application, migration, runtime or Site deployment. Full JWT/browser,
actual abuse enforcement, delivery and device gates remain separate.
