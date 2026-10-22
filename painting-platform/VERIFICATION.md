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
