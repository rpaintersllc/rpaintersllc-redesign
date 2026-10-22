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

Evidence: **12 browser modules linked; 138 tests passed**. Five new checker tests
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
