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


Request browser-fixture follow-up (October 22): five new fixture checks pass;
full verifier links **12 modules and passes 268 tests**. Desktop Chromium used
synthetic provider/create/upload replies to verify partial photos at 320px,
failed-create/no-photo retry at 390px and successful photos at 768px. Receipt focus,
Tab to Open project, copy manual fallback and matching document/scroll widths
at 375/753px were observed. The failed-create state exposed a BODY-focus recovery
gap, recorded as the next correction, not fixed here. See
[tests/REQUEST-BROWSER-QA.md](tests/REQUEST-BROWSER-QA.md). No application code,
Supabase state or Site source/audience changed; fixture output is never deployed.
No real intake/Auth/Storage/worker operation was called.


Failed-request focus correction (October 22): eight new request UI focus cases
pass; three fail against prior request.js. The verifier links **12 modules and
passes 276 tests**. Re-enabled submit recovers from disabled-button blur only
without a newer focus choice; editable-field Enter and later retry ownership
are covered. Successful receipt focus stays intact. Fresh Chromium repetition
was blocked by preview startup timing followed by a browser observation-policy
rejection; it is not claimed as verified. Only tested production request.js was
published owner-private (Site source dc90ae7d7994ec7dd618bfece9b4f44bd9888b45,
deployment appgdep_6adabe552ae48191b445168421b31d8b). No backend setting/data or
real request/email/upload changed. See tests/REQUEST-BROWSER-QA.md for limits.


Request account-prefill correction (October 22): ten new mocked cases pass; six
fail against preceding request.js. The full verifier links **12 modules and
passes 286 tests**. Late hints fill only untouched empty fields; newer name/email
input/change events, deliberate clearing, browser-filled values, logout/new-login,
pending save, completed receipt and identity failures are covered. No new browser
walkthrough or real Auth/intake/Storage/email operation was performed. Only
request.js was published owner-private (source d8b0ad36a2a389f7e148e91145c5a13013240b7e,
deployment appgdep_6adacd0843588191a20989da31ab60f4); no backend/Auth setting or
contractor/audience changed. Metadata remains a UI hint, not authorization.


Request account-link session correction (October 22): eight mocked cases fail
against prior request.js and pass with the fix. Full verifier: **12 modules and
294 tests pass**. Session changes during create/upload/token acquisition prevent
automatic claim; stale pending-claim success/failure uses unconfirmed-link
guidance. Existing unchanged-session success remains covered. A same-account
token renewal also defers to deliberate linking; an already dispatched server
write is not cancelled. No genuine claim/Auth/intake/Storage/email or new browser
walkthrough was performed. Only production request.js was published owner-private
(source c9357941980f56ee1cef37c3129cc3e7fa962fe4, deployment
appgdep_6adadbea59088191886d7eebe9787f10); server permissions and audience unchanged.


Manual project-link follow-up (October 23): eight new isolated cases pass, six
fail against preceding project.js. Full verifier: **12 modules, 302 tests pass**.
Cases cover repeated claim events, unchanged/current and normally renewed token
positive controls, both token-acquisition/dispatch boundaries, and late claim
success/failure across logout/new login. See [tests/PROJECT-LINKING.md](tests/PROJECT-LINKING.md).
Only production project.js was published owner-private (source
6c806b850fc90f2293758b7cf8d72cba04ea0e9a, successful deployment
appgdep_6adae94568008191883961978c5a1d5d). No new browser journey or live
Auth/claim/intake/Storage/email operation; server permissions/audience unchanged.
Already-dispatched claims can still complete server-side.


Account-backed lookup follow-up (October 23): eleven new deferred-response cases
pass; eight fail against preceding project.js. Full verifier: **12 modules and
313 tests pass**. Coverage includes stale success/network errors across logout/
new login, cached-view retirement before a new-account refresh completes, both
token/snapshot dispatch boundaries, authorized recovery, normal renewal,
same-session temporary fallback and independent capability access. No new browser
or live Auth/lookup/Storage/email operation was performed. Only production
project.js was published owner-private (source 71b6ecea9a74f9a37f84570532a3ca71ded35390,
deployment appgdep_6adaf717b3988191b476fae88b3f2cbf). See tests/PROJECT-LINKING.md
for scope; idle logout, conversation and upload session behavior are separate.


Account photo-session follow-up (October 23): ten deferred-response cases pass;
seven fail against prior project.js. Full verifier: **12 modules, 323 tests pass**.
The batch pins one acquired bearer, blocks old-gallery/new-account starts, stops
remaining files across logout/new-login at acquisition/upload/gallery boundaries,
and preserves positive capability/current-account/pre-acquisition-renewal cases.
Selection and private view retire on change; already-sent uploads may still
complete. No real upload/Auth/Storage/customer operation or new browser walkthrough.
Only tested project.js was published owner-private (source
b00f42812cd22165b2d01ce0f6649b505a55b1fd, deployment
appgdep_6adb05bf58a88191af8ac54da8e65bed). No backend/Auth/audience change.
See tests/PROJECT-UPLOAD-SESSIONS.md for proof limits and manual retry guidance.


Account conversation sessions (October 23): 13 new mocked cases pass; ten fail
against preceding conversation.js. Full verifier: **12 modules, 336 tests pass**;
`git diff --check` passes. Session snapshots guard account-only reads, messages
and visit requests/updates at dispatch and response acceptance, and a stale loaded
view cannot issue a new write. Fresh authorized reads restore controls; renewal,
capability links and the contractor token provider have positive controls.
Already-dispatched writes may still save; recovery requires checking before retry.
No real Auth/message/visit/intake/email or new browser walkthrough occurred.
Only conversation.js was pushed to Site source
3347f75518c5dd107333f3865cf3098a24b9cdfc; saved version 40, deployment
appgdep_6adb150b47d481918e108d94872018a6 **failed: Unauthorized** after the
initial request timed out. No successful publication is claimed. Owner-only
access was rechecked unchanged. Restore publishing authorization, then deploy
the existing saved version (do not re-save). No Supabase/runtime/Auth change.
See tests/CONVERSATION-SESSIONS.md for limits and the next lifecycle review.


Conversation panel lifecycle (October 23): all 15 new mocked lifecycle cases pass
with corrected conversation.js and fail against preceding bd59b24 conversation.js.
Full verifier links **12 modules; 351 tests pass**. Detached/replaced panels cannot
issue retained message/read/visit actions; stale success/failure cannot reload,
change retired nodes or run visit-success callbacks. Dispatch is checked after
contractor token acquisition too; stale visit controls from an older list are
blocked. Existing session, send/retry, capability, contractor and visit tests pass.
`git diff --check` passes. No live Auth/customer/message/visit/Storage/email or
new browser/device walkthrough was used. Code-only: latest Site saved version
remains 40 and does not include this correction; no publication retry or access
change occurred. Reconcile pending GitHub web changes before the next packaging.
No server cancellation, idle logout observer or complete JWT isolation is claimed.
See tests/CONVERSATION-LIFECYCLE.md for reproducible evidence and limits.


Request retry browser repeat (October 23): fresh Chromium review of baseline
815ca90 at 390px passed the previously blocked corrected failure/retry keyboard
path. Enter on submit -> synthetic 503 -> enabled/focused submit -> second Enter
-> focused receipt -> Tab -> Open project. Document and scroll widths: 375px;
two synthetic create calls, zero uploads. Fixture JS/CSS/assets matched the
production baseline; no live intake/Auth/Storage/email or Open project navigation.
Full local verifier still links 12 modules and passes 351 tests; diff check passes.
Evidence-only GitHub update, no production source, Site, Supabase or permission
change. tests/REQUEST-BROWSER-QA.md links captured failure and receipt screenshots.
Narrow desktop frames do not prove physical-mobile or screen-reader behavior.


Synthetic project browser fixture (October 23): five new boundary tests pass;
full verifier links 12 modules and passes **356 tests**. Fixture routes require
synthetic account bearer or independent key/project identity, keep message/visit
state in memory, log no payloads and block Auth/Storage/contractor/other transports.
CSP precedes its stub and production modules remain byte-identical. Chromium
verified account-only project -> message -> requested visit -> project refresh ->
denied lookup/private DOM retirement at 390px, plus independent-key read at 320px.
Loaded account/capability document widths equal scroll widths (375/305px); denied
short view equals 390px. After Enter requests the visit, BODY owns focus: confirmed
next accessibility correction, not fixed here. Screenshots/replay/limits are in
PROJECT-BROWSER-QA.md. No real sign-in/JWT, server isolation, customer/message/visit,
Storage, email, configuration or Site publication was performed. Tooling/evidence
are code-only; preview stopped after review.


Visit-request focus correction (October 23): 14 new mocked cases pass; four fail
against preceding conversation.js. Full verifier links 12 modules and passes
370 tests. Successful button-initiated requests focus the current Site visit
heading after conversation/project refresh, preserving later control choices
and suppressing transfer on failures, detached/replaced panels or changed account
sessions. Date-field submits and existing decision controls are unchanged.
Chromium 390px confirms Enter -> requested visit -> focused Site visit heading
(tabIndex=-1) -> Tab to Cancel visit request; loaded document/scroll widths 375px,
two synthetic lookups, one visit, zero messages. No genuine Auth/visit/customer/
email operation. Only code/evidence saved in GitHub; no publication, Supabase,
permission or runtime change. PROJECT-BROWSER-QA.md records capture and limits.
