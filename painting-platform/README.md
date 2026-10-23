# Buzzie: owned painting-services platform pilot

## Account project lookups reject stale sessions (October 23 update)

Account-backed project lookups now acquire a session snapshot, check it before
sending the read and again before rendering. A success or temporary failure from
an ended/replaced session clears the cached project, contact details, scope,
photos and conversation rather than showing an old account's data. Starting a
refresh under a different session retires the previous view before the new read
finishes. Only the newest lookup can change the workspace.

Normal token renewal and same-session temporary-error fallback remain supported;
a fresh authorized lookup restores the view/gallery/conversation. Links containing
a private capability key retain their independent authorization across login
changes. This does not add global logout observation while a page is idle or
prove conversation/upload session safety outside the lookup path.

Added **eleven mocked lookup cases**; eight fail against preceding project.js
and all pass with the correction. Validation: **12 browser modules linked; 313
mocked Node/DOM tests pass** via `npm run verify`; `git diff --check` passes.
No real account read, request, photo, message or email was used. No new browser
or full JWT walkthrough is claimed. See [tests/PROJECT-LINKING.md](tests/PROJECT-LINKING.md).

Published only production project.js after hosted web files matched GitHub's
baseline byte-for-byte. Owner-private Site source
`71b6ecea9a74f9a37f84570532a3ca71ded35390`; successful deployment
`appgdep_6adaf717b3988191b476fae88b3f2cbf`. No Supabase schema/function/Auth setting,
real contractor or audience changed. Tests/evidence remain in GitHub.

Next: review account-owned photo-upload batches and conversation reads across
session changes with isolated responses. Genuine delivery, actual abuse
enforcement, full authenticated browser isolation and physical-device/screen-
reader checks remain separate December 1 review gates.

## Manual project linking protects session feedback (October 23 update)

Save project to my account now rejects repeated handler events while pending
and uses a current session snapshot for dispatch and feedback. Logout or another
login during token acquisition prevents dispatch; changes after a claim was sent
show check-your-account recovery guidance instead of asserting current-account
ownership or showing an old-account failure. Normal token renewal remains
supported for this deliberate action. The private workspace stays available.

Added **eight mocked manual-link cases**; six fail against preceding project.js
and all pass with the correction. Current valid and normally renewed session
positive controls also pass. Validation: **12 browser modules linked; 302 mocked
Node/DOM tests pass** via `npm run verify`; `git diff --check` passes. No real
claim, Auth request, project, photo, message or email was performed, and no new
browser walkthrough is claimed. See [tests/PROJECT-LINKING.md](tests/PROJECT-LINKING.md).

Published only production project.js after hosted web files matched GitHub's
baseline byte-for-byte. Owner-private Site source
`6c806b850fc90f2293758b7cf8d72cba04ea0e9a`; successful deployment
`appgdep_6adae94568008191883961978c5a1d5d`. No Supabase schema/function/Auth setting,
real contractor or audience changed. A dispatched server claim may still finish;
this is dispatch/feedback protection, not cancellation or rollback. Private-key
project access remains independent of the homeowner login session.

Next: review account-backed project lookup and photo-refresh results across
session changes using isolated responses. Genuine email delivery, actual abuse
enforcement, full authenticated browser isolation and physical-device/screen-
reader checks remain separate December 1 review gates.

## Request account linking respects the initiating session (October 22 update)

Automatic linking now belongs to the homeowner session that started the save.
Logout, a different login, guest-to-signed-in changes or token renewal during
saving/uploads prevent a later automatic claim. The receipt/private link and
photo results remain available; guidance asks the homeowner to check or retry
linking deliberately from a confirmed account. An unchanged valid session still
links normally. This conservatively defers automatic linking even for a renewal
of the same account; the server's claim permissions are unchanged.

A claim already sent can still complete server-side. If its response arrives
after a session change, the receipt no longer asserts ownership by the current
account: it accurately says linking could not be completed or confirmed for that
session. This is UI dispatch/feedback protection, not cancellation or rollback
of a previously authorized server write.

Added **eight mocked session/link cases**; all eight fail against preceding
request.js and pass with the fix. The cases cover changes during create, photo
upload, pending claim success/failure, guest saves and token renewal. Existing
unchanged-session linking and saved-receipt/photo cases also pass. Validation:
**12 browser modules linked; 294 mocked Node/DOM tests pass** via `npm run verify`;
`git diff --check` passes. No real claim, account, request, photo or email was used.
No new authenticated/browser walkthrough is claimed.

Published only production request.js after hosted web files matched GitHub's
baseline byte-for-byte. Owner-private Site source
`c9357941980f56ee1cef37c3129cc3e7fa962fe4`; successful deployment
`appgdep_6adadbea59088191886d7eebe9787f10`. No Supabase schema/function/Auth setting,
real contractor or audience changed. Tests and evidence remain in GitHub.

Next: review project-workspace linking and refresh feedback across session
changes using isolated responses. Repeat corrected browser keyboard journeys
when supported observation is available. Genuine delivery, actual abuse
enforcement, full authenticated isolation and physical-device/screen-reader
checks remain separate December 1 review gates.

## Late account hints preserve homeowner contact drafts (October 22 update)

The request page no longer overwrites a homeowner's newer name or email when a
slow account lookup completes. Account hints fill only empty fields that have
received neither input nor change events. Deliberately cleared drafts and
existing browser-filled values remain intact. Hints are skipped during saving
and after the receipt; edit listeners are removed when the lookup completes.
Untouched blank fields still receive the current account hints normally.

Added **ten mocked prefill cases**; six fail against the preceding request.js and
all pass with the fix. Coverage includes independent name/email edits, clearing,
browser-filled values, logout/new-session races, saving/receipt states and failed
identity reads. Validation: **12 browser modules linked; 286 mocked Node/DOM tests
pass** via `npm run verify`; `git diff --check` passes. No new browser walkthrough,
real account read/write, request, upload or email was performed in these tests.

Published only production request.js after all hosted web files matched the
GitHub branch baseline byte-for-byte. Owner-private Site source
`d8b0ad36a2a389f7e148e91145c5a13013240b7e`; successful deployment
`appgdep_6adacd0843588191a20989da31ab60f4`. Tests remain in GitHub. No Supabase
schema/function/Auth setting, real contractor or Site audience changed. Metadata
is still only a contact-field hint, never proof of permission or verified contact.

Next: review slow-save contact edits and optional account-link feedback together;
repeat the corrected request keyboard journeys when supported browser observation
is available. Genuine sender/redirect/delivery, actual abuse enforcement, full
authenticated isolation and physical-device/screen-reader checks remain separate
December 1 review gates.

## Failed-request keyboard recovery fixed (October 22 update)

An unsaved create failure now returns focus to the re-enabled submit button when
that button initiated the request and no newer focus choice occurred. Disabling
the button can blur it to BODY; this no longer strands the keyboard there.
Choosing another field or link during the wait prevents the transfer, including
when that newer control later blurs. Enter from an editable field keeps its focus.
A per-attempt focus listener is removed on completion; later retries get fresh
ownership. Successful receipts retain their existing focus behavior.

Added **eight mocked request focus cases**; three fail against the preceding
request.js and all pass with the correction. Validation: **12 browser modules
linked; 276 mocked Node/DOM tests pass** via `npm run verify`; `git diff --check`
passes. Fresh synthetic Chromium repetition was not completed: the first preview
connection was refused before startup finished, then the browser policy rejected
observation of the error-page tab. No workaround was used. This release has mocked
regression evidence; prior browser findings remain historical, not a new pass.

Published only production request.js after all hosted web files matched the
GitHub baseline byte-for-byte. Owner-private Site source
`dc90ae7d7994ec7dd618bfece9b4f44bd9888b45`; successful deployment
`appgdep_6adabe552ae48191b445168421b31d8b`. Tests/fixtures stay out of the Site.
No Supabase function/schema/Auth setting, real request, photo, email, contractor
or audience changed. See [tests/REQUEST-BROWSER-QA.md](tests/REQUEST-BROWSER-QA.md).

Next: repeat the corrected failed-create keyboard journey when managed browser
observation is available, then review focus/edits during a slow successful save.
Genuine delivery, actual CAPTCHA enforcement, full authenticated isolation and
physical-device/screen-reader checks remain separate December 1 review gates.

## Request receipt browser journeys verified (October 22 update)

Added a local-only request browser fixture for successful uploads, partial photos
and a failed create followed by retry. It copies production modules unchanged,
uses synthetic provider/create/upload replies, blocks undeclared endpoints and
network transports, and sets connect/form CSP restrictions before the stub.
A fixture-only button selects two browser File objects through the real input
change handler. No real request, photo, account, email or notification is created.

Desktop Chromium verified partial photos at **320 px** (receipt retained, accurate
missing-photo guidance, receipt focus and Tab to Open project), failed-create/
no-photo retry at **390 px**, and two successful synthetic uploads at **768 px**.
Receipt document/scroll widths matched at 375 and 753 px for the latter frames.
Copy-link manual fallback was also observed. This is synthetic narrow-frame QA,
not actual Storage upload, physical-mobile or screen-reader evidence.

The failure scenario exposed a keyboard-recovery gap: after an unsaved create
failure the submit button is re-enabled, but focus is BODY. Click retry succeeds
and preserves the fields. This gap is documented, **not fixed by this follow-up**.
See [tests/REQUEST-BROWSER-QA.md](tests/REQUEST-BROWSER-QA.md) for replay and limits.

Validation: five new fixture-boundary tests pass; **12 browser modules linked and
268 mocked Node/DOM tests pass** via `npm run verify`; `git diff --check` passes.
Saved as tests/documentation only; no application, Supabase or Site deployment,
real contractor or audience change. The local preview was stopped after review.

Next: fix failed-create keyboard recovery with focus-ownership/race tests and
repeat the synthetic browser check. Real sender/redirect/delivery, actual abuse
enforcement, full authenticated isolation and device/screen-reader review remain
separate December 1 gates.

## Coverage and assignment boundaries verified (October 22 update)

Added ten mocked gateway cases and a self-contained live SQL rollback fixture
for the pilot's coverage and assignment rules. The gateway rejects another
provider/state, malformed ZIP and missing consent before network calls, and
ignores client-submitted company/account/verification/source fields. RPC coverage
requires the selected active, accepting company plus state, city list and ZIP
prefix; it never falls back to an alternate company. Existing receipts keep their
assignment across pause, deactivation and coverage edits; a different private key
cannot replay them. Contact verification and account ownership are not implied.

All **16 live SQL assertions passed** in isolated Supabase. Synthetic companies
were active only inside the uncommitted transaction; the one synthetic project,
lead and unclaimed outbox row were rolled back. Final fixture lead/company/project
counts were **0/0/0**. Reviewed function-body hashes and a trigger guard fail closed
before fixture inserts. No public intake, Auth, Storage or dispatcher was called;
no real contractor was activated or changed. These are operator RPC checks, not
full browser/JWT proof. See [tests/ROUTING.md](tests/ROUTING.md) for replay and limits.

Validation: **12 browser modules linked; 263 mocked Node/DOM tests pass** through
`npm run verify`; `git diff --check` passes. Tests and evidence are saved in code
only. No production application source, migration, runtime setting or Site
source/audience changed; no deployment was needed. Coverage is city-list/prefix
matching, not address geocoding; external discovery remains separate.

Next: verify request receipt and photo failure/retry states with the local-only
browser fixture, including narrow-frame and keyboard behavior. Real email
sender/redirect/delivery, actual abuse enforcement, full authenticated isolation
and physical-device/screen-reader review remain December 1 launch gates.

## Recovery preserves a newer keyboard choice (October 22 update)

Recovery completion now uses the same focus-ownership guard as email confirmation.
It still focuses Choose a new password after an ordinary deliberate completion,
but no longer takes focus from another control selected during verification or
account-list loading. A newer recovery-link draft keeps its field focus; logout
or an unsuccessful current account load cannot focus a hidden password control.
The change affects focus only, not verification, session adoption or password writes.

Added **10 mocked recovery cases** to the existing confirmation-focus fixture;
five fail against the preceding account.js and all pass with the fix. Manual and
callback recovery cover ordinary completion, changed focus during verification/
list reads, logout, a newer pasted draft and disabled-button blur. Two older
Auth fixtures now explicitly model the initiating focused control instead of
leaving activeElement undefined; their expected behavior remains unchanged.

Validation: **12 browser modules linked; 253 mocked Node/DOM tests pass** through
`npm run verify`; `git diff --check` passes. This follow-up did not run a new
browser/device/screen-reader walkthrough or make a genuine recovery request.
No real account, password, project, message or email was changed.

Published only the tested production `account.js` after the hosted baseline
matched GitHub byte-for-byte. Owner-private Site source
`76bddc67071bbdc161b261abbd5f004f5ff0f22c`; successful deployment
`appgdep_6ada94a76928819185865ead80c47a41`. Tests remain in GitHub; no fixture,
Supabase function/migration/Auth setting, contractor or audience changed.

Next: review provider coverage and assignment boundary cases with isolated
fixtures, keeping external discovery separate. Genuine sender/redirect/delivery,
actual CAPTCHA enforcement, full authenticated browser isolation and physical-
device/screen-reader checks remain distinct December 1 launch-review gates.

## Confirmation keyboard focus and signup browser follow-up (October 22 update)

A synthetic Chromium walkthrough exposed a keyboard gap after successful email
confirmation: removing the callback button left focus on the document. Manual
confirmation also left focus below the newly opened dashboard. Successful
confirmation now focuses the visible account heading when focus still belongs to
the initiating confirmation control; the next Tab reaches Refresh projects.
Callback removal happens after account presentation. Another control chosen during
verification/list loading, a newer pasted link, logout or a failed account load
prevents the heading transfer. Existing recovery password focus is preserved.

Added **14 mocked focus cases**; five fail against the preceding account.js and
all pass with the fix. Extended the local-only browser fixture with immediate-
session signup, rejected signup and signup-link confirmation; two new fixture
boundary checks pass. Chromium verified signup consent and keyboard-entered
12-character validation, conditional confirmation wording at 320px, immediate
signup/session/focus at 390px, rejected signup at 768px, callback confirmation and
Tab at 320px, and manual pasted-link Enter focus at 390px. Document/usable widths
matched at 305/375/753px in those respective narrow-frame states. These are
desktop frames with synthetic responses, not physical phones or real Auth/email.

Validation: **12 browser modules linked; 243 mocked tests pass**, plus
`git diff --check`. Only the tested production `account.js` was copied to the
existing owner-private Site after its hosted baseline matched GitHub HEAD byte-
for-byte. Site source `cd0abb149687f1e64720d08604f804d1b52c90b9`; successful
private deployment `appgdep_6ada88af89888191abdb26fd952f121e`. No fixture script
was published. Tests/QA documentation stay in GitHub. No Supabase API, migration,
Auth configuration, real account/password/email, contractor or audience changed.
The local preview was stopped after review.

Next: review remaining recovery completion and signed-out keyboard transitions
with isolated fixtures; keep genuine sender/redirect/delivery verification,
actual CAPTCHA enforcement, full authenticated browser isolation, physical-device
and screen-reader checks as separate gates for the December 1 review.

## Isolated API upload fix deployed (October 22 update)

Published the previously tested upload cleanup fix to **platform-api version 8**
in isolated project `ocmgrgvzhuhyigaddhue`. Before deployment, version 7's single
`index.ts` matched the preceding GitHub API source byte-for-byte. A final live
source/version check and unchanged PR head confirmed no intervening deployment
or branch change. Only the upload error handler differed: independent failed-state
metadata/object cleanup and accurate unconfirmed-upload guidance.

After deployment, the ACTIVE version 8 source matches GitHub commit
`d4a895d5a723e6fa9539f36ae1fa11816c5ddd9d` byte-for-byte. Preserved the existing
`verify_jwt=false` setting and the handler's capability/confirmed-user/membership
checks. No secret value was retrieved or modified; no runtime setting, schema,
migration, grant, contractor activation, Site source or audience changed.

Validation: fresh checkout `npm run verify` linked **12 browser modules and passed
227 mocked Node/DOM tests**. Four harmless live smoke paths passed before and
after publication: provider GET 200 (R Painters only), untrusted-origin GET 403,
upload POST without a project 401 before reservation/Storage, and OPTIONS 204.
Only provider catalog data was read. No customer request, account, message,
notification dispatch, Storage upload or object deletion was performed.

This updates the API used by the existing private pilot; no Site deployment was
needed. The upload-failure cleanup remains best effort, and real provider
failure/deletion, signed-URL expiry and full authenticated browser journeys are
not established by mocks or early-rejection smoke checks. See
[tests/UPLOAD-CLEANUP.md](tests/UPLOAD-CLEANUP.md) for release evidence and limits.

Next: review the remaining synthetic signup/browser states and permitted
confirmation/recovery journeys, while retaining owner sender/redirect decisions,
genuine email delivery, actual CAPTCHA enforcement and physical-device/screen-
reader checks as launch gates. A real Storage cleanup exercise requires an
explicitly permitted disposable object; never use a customer photo as a test.

## Initial source-only upload cleanup evidence (October 22 update)

Fixed the branch's `platform-api` upload error path: metadata failure no longer
skips the independent best-effort deletion of the exact reserved object. A lost
upload response or failed ready-state write may leave an object behind, so the
502 response now says the upload could not be confirmed and asks the homeowner
to refresh and retry only missing photos, rather than asserting it was not saved.
No upload is automatically replayed.

Added **10 synthetic gateway tests** for successful upload, rejected/lost upload
responses, failed ready writes, failed-state HTTP/transport errors, failed/lost
delete responses, full capacity and deliberate retry with a fresh reservation.
Four cases fail against the preceding API source and pass with the fix. The
fixture permits modeled partial object creation before an upload failure, so it
can detect skipped cleanup instead of assuming a failed response saved nothing.
The retry case proves cleanup targets the old reservation, not the successful
replacement. No live object, account, request or message was created or deleted.

Validation: **12 browser modules linked; 227 mocked Node/DOM tests pass** through
`npm run verify`; `git diff --check` passes. Current Storage REST documentation
confirms the existing single-object DELETE route; no endpoint, grants, migration,
Auth setting, contractor, audience or schema changed. See
[tests/UPLOAD-CLEANUP.md](tests/UPLOAD-CLEANUP.md) for evidence and limits.

At this initial checkpoint the fix was saved in branch code/tests/docs only.
It was subsequently deployed as isolated API version 8, as recorded above. This
source evidence does not establish real Storage cleanup success; cleanup remains
best effort when the provider is unavailable.

The subsequent release compared deployed source/settings to the baseline and
verified read-only/early-rejection smoke paths without uploading or deleting real
objects. Keep genuine Storage
cleanup, authenticated browser journeys, email delivery and actual CAPTCHA
verification as separate review evidence.

## Photo and conversation limit boundaries (October 22 update)

Extended `tests/rpc-isolation.sql` with **31 additional live database checks**.
On October 22, the full **65-check** transaction passed in the isolated
pilot. The final ROLLBACK report again returned zero fixture leads, Auth rows and
companies. No existing customer/company data was changed, no contractor activated
and no Auth API, public intake, Storage upload or notification dispatcher called.

New photo evidence covers zero/over-limit/exact-5-MiB sizes, five pending slots,
sixth-slot denial, the exact five-minute expiry boundary and recovery of an older
pending reservation. A wrong capability or invalid MIME cannot expire another
slot; old ready photos still count toward capacity. These are metadata checks,
not uploaded-object or signed-URL-expiry evidence.

New conversation evidence covers the 40-message rolling-day limit per author,
exact 24-hour exclusion, the 500-message total limit and idempotent retries at both
caps. Visit checks cover past/day-181/invalid-window denial, today/day-180
acceptance, a single open visit, expired-date confirmation denial, ten-visit
history capacity and retry behavior. Confirming/cancelling visits preserves each
later pipeline status: quoted, won and lost. All data remains synthetic and
uncommitted; these project limits do not establish CAPTCHA or global abuse
protection. Current SQL cases run serially, not as a parallel race test.

Validation: **65 live SQL checks**, **12 browser modules linked**, **217 mocked
Node/DOM tests pass**, and `git diff --check` passes. The live SQL is manual and
separate from the local Node suite. Saved in tests/runbook/launch documentation
only; no application fix was needed and no Site or backend change was deployed.

Next: verify upload-error cleanup/retry behavior through synthetic gateway tests,
then review the remaining account/browser signup states. Genuine email delivery,
actual CAPTCHA enforcement, full authenticated browser journeys, physical mobile
devices and screen readers remain separate launch gates.

## Reproducible live RPC isolation checks (October 22 update)

Added `tests/rpc-isolation.sql`, an operator-only transaction fixture that creates
its own two inactive companies, three synthetic identities and two projects.
It no longer depends on a previously saved test project or changes R Painters'
intake availability. All fixture rows and generated outbox/status events roll
back; no Auth API, intake endpoint, Storage object or dispatcher is invoked.

At 17:54 UTC October 22, all **34 explicit checks passed** against the isolated
Supabase pilot: confirmed-email/capability ownership and no reassignment; review
membership, project scope and revision conflicts; owner-only availability; company
status scope; photo metadata reservation; message authorization/idempotency; and
cross-project visit isolation, confirmation/cancellation status transitions and
terminal-state protection. Positive controls demonstrate permitted operations
within the same transaction. Post-rollback aggregate counts were **0 fixture
leads, 0 fixture Auth rows and 0 fixture companies**. Unexpected fixture-table row
triggers abort the script before inserts. Ten-second statement/two-second lock
timeouts bound the test; SQL exceptions remain active even if ASSERT is disabled.

Validation: `npm run verify` links **12 browser modules and passes 217 mocked
tests**; `git diff --check` passes. The new SQL is a separate manual live check,
not 34 additional Node tests. An initial fixture assertion combined a mutating
function and a state subquery in one expression; separating the write from the
read fixed the fixture's snapshot-order problem. The aborted attempt also left
zero fixture records. No application defect or production-code change is inferred.

Saved in tests/documentation only, with no Site deployment, migration, Auth
configuration, grant, audience or contractor activation change. This is direct
RPC evidence as an authorized operator, not a full JWT/browser isolation test.
`platform_interact` and `platform_set_status` rely on prior gateway membership
verification; a supplied business UUID alone is not authentication. See
[tests/ACCESS-BOUNDARIES.md](tests/ACCESS-BOUNDARIES.md) for scope and replay steps.

Next: add isolated coverage for photo-slot capacity/stale reservations and visit
rate/date/late-pipeline boundaries, then complete full authenticated browser
walkthroughs when authorized test identities are available. Genuine email
delivery, actual abuse enforcement and physical-device/screen-reader checks
remain separate launch gates.

## Expanded account/contractor access evidence (October 22 update)

Added `tests/access-boundaries.test.mjs`: a synthetic two-homeowner/two-company
API matrix that checks the gateway's supplied ownership and membership filters.
Foreign homeowner lookup/upload/conversation/message/visit actions stop with 404
before private reads, photo reservation/sign/upload or mutation RPCs. Submitted
owner/account IDs cannot override the verified user. Unconfirmed upload stops
before database access. Foreign-company selection is rejected for seven contractor
actions, and approved members cannot use conversation/message/visit decisions on
another company's project.

Positive controls show that the same fixture permits owning-homeowner read/upload
and an approved contractor's own list/photo signing; it does not blindly deny all
requests. Homeowner photo output omits raw storage paths/access hashes. All 20 new
checks pass. In a separate disposable source copy, removing only the homeowner
ownership filter causes seven checks to fail, including all six foreign-homeowner
routes. The weakened copy is not committed, deployed or used against the pilot.

Added the repeatable metadata-only `operations/access-posture.sql` report and
[tests/ACCESS-BOUNDARIES.md](tests/ACCESS-BOUNDARIES.md). At 15:59 UTC October 22,
the isolated pilot report showed all six selected private tables with RLS enabled
and no table-level CRUD grant to anon/authenticated; all seven selected server
functions had one overload and no client EXECUTE grant. The read-only transaction
used a five-second timeout and ROLLBACK. No customer rows, Auth users, function
bodies, storage objects or secrets were read. Existing security-advisor findings
were reviewed without relaxing permissions.

Validation: **12 browser modules linked; 217 mocked tests pass** through
`npm run verify`; `git diff --check` passes. These mocks prove gateway dispatch
boundaries, not live PostgREST/RPC behavior, full JWT/browser isolation or actual
signed-URL expiration. The metadata report covers selected table/function grants,
not a complete security audit. Prior rollback SQL evidence remains separate.

Saved in branch tests/documentation/report code only. No Site deployment, backend
code, migration, Auth setting, grants, audience or contractor changed. No real
account, lead, photo, message, visit or email was created or modified.

Next: review the live RPC ownership/membership invariants with reproducible
rollback-only fixtures, while keeping genuine email delivery, actual abuse
enforcement and physical-device/screen-reader walkthroughs as separate gates.

## Account keyboard focus after sign-in (October 22 update)

Successful homeowner sign-in and immediate-session signup now move focus from the
submitted auth control to the visible confirmed account heading. The heading has
`tabindex=-1`, so it can receive deliberate focus without becoming an extra Tab
stop. The next Tab reaches Refresh projects. The guard also handles browsers
that blur the submit button to the document when the busy state disables it.

Focus transfer requires the current account lookup/session and the original
control still belonging to the auth panel. If the user focused another control
while Auth/identity checks were pending, their chosen focus is preserved. Manual
project refreshes do not move focus. Existing email recovery still focuses the
new-password field through its separate path; no server permissions changed.

Validation: **12 browser modules linked; 197 mocked tests pass** through
`npm run verify`. Seven focus cases cover sign-in/signup, focus changes during
Auth and identity reads, refresh, logout and button blur; three fail against the
previous account.js/HTML. `git diff --check` passes. Synthetic Chromium review
confirmed password Enter at 390px and button Enter at 320px focus account-identity;
Tab then reaches Refresh projects. Recovery at 390px still focuses new-password.
The local fixture's CSP/network isolation stayed in place and the preview was
stopped after review. No real sign-in, account, password, request or email changed.

Published owner-private from Site source
`abe26ea375bb1c0524c3ea814140013a64d55bb2`; successful deployment
`appgdep_6ada254d93c081919a50ee0be6918d10`. Only tested production account.js and
account.html were copied after both hosted files matched GitHub HEAD byte-for-byte.
Tests/documentation remain in branch code; no mock script was deployed. No backend,
migration, Auth setting, audience or contractor changed.

Next: review signed-out keyboard recovery and remaining synthetic signup/browser
states, then revisit server-side cross-account evidence. Genuine email delivery,
actual abuse enforcement, physical devices and screen-reader announcements remain
separate gates; this focus improvement does not close them.

## Synthetic account browser review and narrow dashboard fix (October 22 update)

Added a local-only account browser-fixture generator with six labeled scenarios
and 320/390/768px frames. It copies production application modules unchanged and
substitutes only declared synthetic responses before account.js loads. CSP blocks
connections/form submission, unexpected fetch calls reject, and alternative
network transports are disabled. No real Auth request or customer mutation occurs.
The generated fixture is never deployed; reproduction and evidence are in
[tests/ACCOUNT-BROWSER-QA.md](tests/ACCOUNT-BROWSER-QA.md).

The signed-in browser review exposed an account email heading extending to 440px
inside 375px usable width. Production CSS now allows the account dashboard header
child to shrink and its identity email to wrap anywhere. After the fix, document
and usable widths match at 305/375/753px for 320/390/768px frames. Brand, markup,
account behavior and server access rules are unchanged.

Browser evidence: Enter from the password field opens a synthetic account and
project card; Enter on Finish password recovery loads the panel and focuses
new-password. Expired-link, invalid-sign-in and failed-project-list notices were
also observed without overflow. No password was saved; the signup scenario is
prepared but its full browser walkthrough was not performed. Narrow Chromium
frames do not prove physical-mobile, Safari or screen-reader behavior.

Validation: **12 browser modules linked; 190 mocked tests pass**. Three new fixture
boundary tests check declared operations, rejected origins/methods/transports,
failure responses, CSP and unchanged copied account.js. `git diff --check` passes.
No account, password, customer request, photo, visit, message or email was created
or changed. The managed preview was stopped after review.

Only tested production theme.css was published owner-private after its hosted
baseline matched GitHub HEAD byte-for-byte. Site source
`edece578e0dee1807f8db7236bcaa0d36b83559a`; successful deployment
`appgdep_6ada167d4f308191a8e4a184fffbc2b5`. The fixture, tests and runbook are saved
in branch code only. No backend, migration, Auth setting, audience or contractor
changed.

Next: review deliberate dashboard focus after sign-in (the browser currently
leaves focus on the document when the auth form hides), then extend safe browser
account evidence. Genuine email delivery, actual abuse enforcement, physical
devices and screen readers remain separate gates.

## Sign-in, signup and recovery response isolation (October 22 update)

Homeowner sign-in and signup now adopt a returned session only while the local
session revision still matches the attempt. Late success/failure after logout or
a newer login cannot restore access, overwrite the newer feedback or clear a
new password draft. A successful current response clears only the password value
that was submitted. After adoption, account-ready feedback also checks the adopted
revision following the project-list load. Ordinary failures preserve the input
and release the existing shared Auth lock for a deliberate retry.

Recovery requests now apply feedback only to the revision that started the
request. Signup without an immediate session retains conditional confirmation
wording instead of unconditionally asserting a confirmation email was sent.
Native CAPTCHA payloads, reset behavior, server authentication and allowed
redirects are unchanged. A discarded response does not cancel a request already
received by Auth or revoke a server-issued session; this is client isolation.

Validation: **12 browser modules linked; 187 mocked Node/DOM tests pass** through
`npm run verify`. Eighteen new cases cover all three actions' late success/failure
across logout and newer login, edited passwords, post-adoption logout, conditional
signup feedback and deliberate retry. Fifteen fail against the previous
account.js. `git diff --check` passes. These tests use synthetic responses and do
not create accounts, change passwords, register fake leads or send email. Genuine
Auth delivery and a full browser account journey remain unverified.

Published owner-private from Site source
`a6cbeb4f6da24c285c41d74c6b89aaea1aab4129`; successful deployment
`appgdep_6ada0870d5e881919dfd0a9f3ec1f248`. Only production account.js changed.
The opening Site source matched the GitHub baseline byte-for-byte, and packaged
account.js matched the tested code. No backend, schema, Auth configuration,
audience or contractor changed.

Next: prepare a browser account-journey fixture with synthetic responses to
review keyboard/focus and visible recovery states without live Auth writes.
Genuine email delivery, actual abuse enforcement and physical-device/screen-reader
checks remain separate launch gates.

## Email-link adoption and account-load recovery (October 22 update)

Pasted confirmation/recovery links now adopt their returned session only if the
local session has not changed while verification was pending. Late successes and
failures after logout or a newer login cannot replace the current session, clear
a new pasted link or overwrite current feedback. The shared authentication lock
continues to block duplicate submits; ordinary errors preserve the link for a
deliberate retry. A successful response clears only the originally submitted link.

Both pasted links and URL callbacks now scope account-load feedback to the adopted
session. A late list response after logout cannot show recovery success or focus
the hidden password field. A verified link followed by a failed account load
accurately asks for an account refresh; it does not imply verification failed or
that a password was changed. Password focus occurs only after a successful load.
A consumed callback button is removed when its session is adopted; a discarded
pre-adoption result leaves the button available for a new deliberate click.

Validation: **12 browser modules linked; 169 mocked Node/DOM tests pass** through
`npm run verify`. Twelve new UI cases cover both link entry paths, late
success/failure, post-adoption logout, failed account load, preserved newer link,
duplicate events, normal recovery/confirmation wording and retry. Nine fail
against the previous account.js. An existing callback race test now checks that
the newer session's feedback is preserved. `git diff --check` passes. No real
confirmation, recovery, account, password, lead or email was created or changed;
this is client behavior evidence with simulated responses, not delivery or an
end-to-end Auth/browser claim.

Published owner-private from Site source
`f8baf5144ba6feb14ab82f27df78bc517aedb37c`; successful deployment
`appgdep_6ad9fa758ae081919ed242fd26bb81c1`. Only production account.js changed,
after its hosted baseline matched GitHub HEAD byte-for-byte. No backend, schema,
Auth setting, audience or contractor changed.

Next: review sign-in/signup/recovery responses across local session changes and
complete remaining safe account/browser evidence. Genuine email delivery, actual
abuse enforcement and physical-device/accessibility checks remain separate gates.

## Account mutation/session recovery (October 22 update)

Project linking and password updates now have independent in-flight locks and
snapshot their submitted values. A late response clears a field only if it still
contains that submitted value; a newer password draft is retained and explicitly
marked unsaved. An ordinary failure unlocks a deliberate retry without clearing
the input. A successful link followed by a failed project-list load now explains
that linking succeeded and asks for an account refresh instead of implying the
list reloaded successfully.

Both mutations obtain a token-bound session snapshot, recheck it before dispatch
and ignore success/failure feedback after logout or a newer session. An obsolete
token cannot dispatch while token acquisition or snapshot resolution is pending.
Normal token renewal remains supported. This protects client state and feedback;
it does not cancel an already accepted server write or change server ownership,
password policy or session revocation rules.

Validation: **12 browser modules linked; 157 mocked Node/DOM tests pass** through
`npm run verify`. Thirteen new UI cases cover duplicate events, edited fields,
late success/failure across sign-out/new login, deliberate retry, both token
acquisition boundaries and saved-link/failed-list recovery. Nine of the first
eleven cases fail against the prior account.js. Two additional helper tests
cover normal renewal and an obsolete token before dispatch. `git diff --check`
passes. No real account, password, link ownership, request or email was changed;
these are simulated requests and session transitions, not genuine Auth delivery
or a full browser recovery walkthrough.

Published owner-private from Site source
`79e1fd4db22c25fe166ff4fb00947abe92a189ab`; successful deployment
`appgdep_6ad9ec01234c8191880456fa1b7b740c`. Only account.js and auth-session.js
were copied after both hosted baseline files matched GitHub HEAD byte-for-byte.
No backend, migration, Auth configuration, audience or contractor changed.

Next: review manual confirmation-link adoption against session changes, then
remaining account/browser evidence without sending test emails. Genuine email
delivery, actual abuse enforcement and physical-device/accessibility review
remain separate launch gates.

## Safe notification operations diagnostics (October 22 update)

Added operator-only read-only SQL reports and a runbook in
[operations/README.md](operations/README.md). They expose aggregate queue and
retry-scheduler health without dispatching work or reading secrets, customer
contacts, raw errors, request bodies or scheduler commands. Buzzie projects,
legacy direct intake and external discovery remain separate channels. Reports
identify exhausted retries, expired/missing processing leases and missing/inactive
retry jobs; provider acceptance and SQL success are explicitly not delivery proof.

Validation: both reports executed successfully against isolated project
`ocmgrgvzhuhyigaddhue` using read-only transactions with a five-second timeout and
ROLLBACK. At 09:59 UTC October 22, all three queues had zero pending/processing,
failed, due, exhausted or missing/expired-lease records. Existing provider-accepted
records were 2 Buzzie projects, 4 other direct-intake and 1 discovery; these are
queue records, not verified customers. Both retry schedules were active with
288 SQL successes and zero SQL failures each in the preceding 24 hours. No worker
was manually invoked and no email delivery was verified.

The synthetic SQL fixture generator embeds the actual report queries and returned
**five passing checks**, covering retry/time/lease boundaries, channel isolation,
entirely empty queues, missing schedules and the 24-hour history window. It uses
only CTEs, with no inserts or real jobs. The existing local verifier still links
**12 browser modules and passes 142 mocked tests**. `git diff --check` passes.

Saved in branch code/documentation only; no Site deployment, schema migration,
permissions, Auth settings or notification configuration changed. No lead,
account, message, visit, photo or email was created or changed. Current advisory
findings were reviewed; no permissions were relaxed to silence server-only RLS
notices. These tools add observability, not a public-launch approval.

Next: review account-link recovery and remaining cross-account launch evidence
without sending emails or creating fake requests. Genuine delivery, actual abuse
enforcement and physical-device/accessibility walkthroughs remain separate gates.

## Private photo display recovery (October 22 update)

The shared homeowner/contractor photo renderer now replaces a failed image with
a numbered status notice explaining how to retry by refreshing the workspace.
Missing signed-URL metadata gets the same recovery guidance. Images have numbered
accessible names, so each failure can be distinguished in a multi-photo gallery.
The notice does not expose the signed URL, claim deletion or ask for re-upload.

A late image error from an older gallery cannot replace or append content in a
new gallery. Repeated error callbacks do not duplicate notices. When an authorized
workspace refresh returns a usable URL, the normal renderer replaces the notice
with the image. This does not automatically refresh URLs, change their existing
30-minute server lifetime or determine whether a browser failure was expiration,
a network problem or another error. Photo storage and access rules are unchanged.

Validation: **12 browser modules linked; 142 Node/DOM tests pass** through
`npm run verify`. Four new mocked photo-display regressions all fail against the
previous common.js: failed-image guidance, stale/repeated events, replacement
with a refreshed URL, and unavailable metadata/numbered names. `git diff --check`
passes. These tests simulate DOM error callbacks and synthetic URLs; they do not
prove actual signed-URL expiry or real browser/storage retrieval. No real photo,
lead, message, visit, account or email was created, changed or deleted.

Published owner-private from Site source
`f4a057b9844e54b077fda1decb41538635efba8d`; successful deployment
`appgdep_6ad9cff2eaa4819183b03259ce5c263c`. Only production common.js was copied
after matching the existing Site baseline byte-for-byte to the branch. No backend,
schema, Auth setting, audience or contractor changed.

Next: review safe operational/notification diagnostics without sending anything.
Genuine account/email delivery, actual abuse enforcement, physical-mobile and
screen-reader walkthroughs remain separate launch gates.

## Conversation access recovery (October 22 update)

The shared homeowner/contractor conversation now keeps the message input/send
control disabled until its first successful read. A failed initial load cannot
send a message through a form whose access has not been established. A later
successful Refresh conversation restores the controls.

A 401/403/404 from a conversation read, message write or visit decision clears the
private thread, visit controls and unsent draft, disables sends/visit actions and
invalidates older pending reads. A later network failure cannot restore the
retired content. A successful fresh read is required to resume. Existing ordinary
transient failures after a successful read retain their prior recovery behavior;
saved-message and saved-visit feedback still distinguishes saved writes from a
failed reload. These changes affect the conversation panel, not server privileges
or JWT revocation.

Validation: **12 browser modules linked; 138 Node/DOM tests pass** through
`npm run verify`. Seven new mocked regressions in
`tests/conversation-access-ui.test.mjs` all fail against the previous module.
They cover initial-load failure, 401/403/404 read denial plus network failure and
recovery, denied message/visit writes, and an older read after a newer access
denial. Existing send/visit retry and concurrency regressions still pass.
`git diff --check` passes. No real message, visit, account, lead, email or upload
was created or changed; no new live-provider/browser/device evidence is claimed.

Published owner-private from Site source
`2c7cd5d02efedf43ffa63eaf817f3e257720f7f2`; successful deployment
`appgdep_6ad9c254e5e48191adc5b6f50831dec3`. Only production conversation.js was
copied after matching its existing Site baseline to the branch. No backend,
schema, Auth setting, audience or contractor changed.

Next: review photo access/recovery and remaining operational launch evidence.
Genuine account/email delivery, actual abuse enforcement, physical-mobile and
screen-reader walkthroughs remain separate launch gates.

## Project access-denial cache retirement (October 22 update)

A current 401/403/404 project lookup now retires the cached project model and
removes contact/scope text, photo elements, timeline, private-link text, company
links, file selection and conversation UI from the page. Previously, denial hid
the workspace but retained its model; a subsequent network failure could invoke
the transient-error fallback and reopen that old private data. The fallback now
has no retired model to show. A fresh successful lookup is required to restore
the project; reopening its conversation mounts a fresh thread.

Account-backed project URLs now give account-specific recovery guidance and a
visible Open My account link when access is unavailable. The page does not create
a guest key for account access. A transient error before any denial still keeps
the previously authorized view with its existing stale-data warning.

Validation: **12 browser modules linked; 131 tests pass** through `npm run verify`.
Five new mocked regressions all fail against the prior project.js/project.html.
They cover 401/403/404 followed by network failure, sensitive DOM cleanup and
upload blocking, fresh authorized recovery with conversation reload, and the
account recovery link/bearer request. `git diff --check` passes. No real account,
lead, upload, message, visit, email or permission was changed. This is client
cache/display recovery evidence, not a real expired-session/browser walkthrough.
It does not revoke JWTs, erase user-saved browser links or change server access.

Published owner-private from Site source
`44c72f73957c757aa2098266c3154c25b732c6dd`; successful deployment
`appgdep_6ad9b4fcd4d88191b33a9894febca69c`. Only production project.js and
project.html were copied after matching both Site baselines to the branch.
No backend, schema, Auth setting, audience or contractor changed.

Next: review recovery of conversation loads and remaining genuine account/email,
abuse-enforcement, physical-mobile and screen-reader launch gates. Continue using
the local verification command before publishing code changes.

## Repeatable local validation gate (October 22 update)

`npm run verify --prefix painting-platform` now runs a fail-fast local check of
the static browser module graph, followed by the explicit mocked Node/DOM suite.
It parses/links browser modules without evaluating their top-level code, catching
missing files, missing named exports and syntax errors before runtime. No new
dependency, hosted workflow, deployment or live integration run was added.
`VERIFICATION.md` records the exact command, Node version and remaining limits.

Validation: **12 browser modules linked; 126 tests pass**, including five new
fault-injection checks for the verifier: cyclic imports without evaluation,
missing files, invalid named exports, syntax errors and outside-directory imports.
The valid fixture intentionally throws at top level; successful validation proves
that code was never evaluated. The production module check and complete mocked
suite passed through the new command on Node 24.19.0. `git diff --check` passes.

This change is **saved in code only**. Browser application files and the published
owner-private Site did not need changes. No backend, schema, Auth setting,
audience or contractor changed; no real account, lead, message, visit, email or
upload was created. Static linking does not validate dynamic imports, actual
provider behavior or physical-mobile/screen-reader/email launch gates.

Next: review account-backed project access and use this verification gate for
future changes. Genuine sender/redirect/delivery setup, abuse enforcement and
device walkthroughs remain required before public access.

## Contractor status and availability action guards (October 22 update)

Project status writes now snapshot the requested value, reject repeat change
events while pending and display exactly the confirmed submitted status. A failed
current write restores the previous selection and permits a deliberate retry.
Late success/failure and detached controls cannot update a signed-out or replaced
card/workspace. Metrics use the confirmed status instead of a value changed in
the select while its earlier write is pending.

Owner pause/resume controls now snapshot the business and expected availability,
block repeated clicks and apply results only to the still-current coverage view.
A response from a previous sign-in or replaced control cannot change the new
workspace's availability display or feedback. Existing owner-only server checks
and expected-current concurrency checks are unchanged. These guards do not cancel
accepted server writes, add cross-tab locking, or replace a fresh server read.

Validation: **121 Node/DOM tests pass**, including nine mocked status/availability
cases in `tests/contractor-actions-ui.test.mjs`. Eight fail against the previous
pro.js; the remaining case confirms failed-status retry behavior. Cases include
double events, a changed select during save, late success/failure after sign-out
or a newer login, detached actions and current-error recovery. JS syntax checks
and `git diff --check` pass. No real status, availability, account, lead, message,
visit, upload or email was changed. These are simulated UI checks, not new live
server or browser/mobile evidence.

Published owner-private from Site source
`9337b7755e3142ae893866571e4315a5b21476c9`; successful deployment
`appgdep_6ad9968a227c81919780d61198ba30f8`. Only production pro.js was copied,
after matching the Site baseline byte-for-byte to the branch. No backend, schema,
Auth setting, audience or contractor changed.

Next: account-backed project access review and a repeatable automated validation
workflow for the growing launch suite. Actual account/email delivery, abuse
enforcement, physical-mobile and screen-reader walkthroughs remain launch gates.

## Private review save recovery (October 21 update)

Private contractor reviews now reject concurrent submit events, including when
notes or qualification change while a save is pending. The form exposes its
pending state and sends a snapshot of the submitted draft. On success it keeps
newer edits and explicitly says those edits are not saved yet. A failed save keeps
the text and original expected revision for a deliberate retry.

Review forms also bind their actions/results to the current rendered card,
workspace generation and signed-in state. Detached or superseded forms cannot
start a new write or apply a late response to the model used by a replacement
form. The existing server optimistic-revision check remains authoritative.
This is a guard for private reviews only; status, availability and conversation
controls retain their own existing behavior. It does not cancel an accepted
server write or preserve drafts across filtering, navigation or page reloads.

Validation: **112 Node/DOM tests pass**. Five new mocked tests in
`tests/contractor-review-save.test.mjs` cover repeated submit, newer drafts,
failed-write retry, late results after card replacement and detached submission.
Four fail against the prior pro.js; the fifth confirms existing retry behavior.
JS syntax checks and `git diff --check` pass. No real review, contractor session,
account, lead, message, visit, email or upload was created. No new browser/mobile
or real server-write verification is claimed by these DOM checks.

Published owner-private from Site source
`e703e4649cd5d4f4a299a917b909f3d0dea7e7f0`; successful deployment
`appgdep_6ad9898748348191a797032b23abec10`. Only production pro.js was copied,
after matching the existing Site file byte-for-byte to the branch baseline.
No backend, schema, Auth setting, audience or contractor changed.

Next: review stale status/availability feedback and account-backed project access.
Genuine account/email delivery, abuse enforcement, physical-mobile and
screen-reader walkthroughs remain separate launch gates.

## Contractor refresh session isolation (October 21 update)

Contractor credential renewal now uses an isolated in-memory session helper.
Concurrent actions share one refresh request. Clearing the session invalidates
pending refreshes; an older success cannot restore signed-out credentials or
replace a newer login, and an older failure cannot clear the newer login.
A current failed refresh clears the workspace once and requires sign-in again.
API calls also check that their resolved token still belongs to the active local
contractor session before starting the request. Homeowner session storage and
server membership checks remain separate and unchanged.

Validation: **107 Node/DOM tests pass**, including six session-helper cases and
three deferred-response contractor UI regressions. All three UI regressions
fail against the previous pro.js: stale renewal revives access after logout,
replaces a newer token, or clears a newer login. The fixed panel preserves logout
and the newer login in each case. The existing contractor-inbox controls test
also passes. JS syntax checks and `git diff --check` pass. These checks use mocks;
no real sign-in, account, password, lead, message, visit, upload or email was used.
No new browser/mobile or genuine Auth-provider behavior is claimed.

Published owner-private from Site source
`caa411735fdff72b39ba497a86ccce8a32e9e012`; successful deployment
`appgdep_6ad97aa37d708191a8a708fa3f4356bb`. The prior Site pro.js matched the
branch baseline before copying it and the new contractor-session.js module.
No backend, schema, Auth configuration, audience or contractor changed. This is
local credential lifecycle protection; it does not immediately revoke all issued
JWTs or synchronize sessions across tabs.

Next: review contractor stale mutation feedback and account-backed project access;
physical-mobile, screen-reader and genuine account/email walkthroughs remain
separate launch gates, along with actual abuse enforcement and sender setup.

## Narrow-screen layout and message-region access (October 21 update)

A long, unbroken homeowner email made the private project grid wider than a narrow
screen. The responsive grid now uses a zero minimum track, its project columns
can shrink and contact text wraps inside its panel. The message history is now a
named region with an explicit keyboard tab stop, allowing keyboard users to reach
its independently scrollable content. Branding, routing and server permissions
are unchanged.

Validation: **98 Node/DOM tests pass**, including two new tests that verify the
local responsive fixtures allow only synthetic provider/project/conversation
reads and reject writes, Auth requests and unexpected origins/paths/methods.
The existing conversation test also checks the region name, role and tabindex.
`git diff --check` passes. Chromium QA found the original project overflow at
591px for a 305px content viewport; after the fix both widths are 305px. Request,
project and signed-out account pages were checked at 320/390/768px iframe widths
(with scrollbar-adjusted content widths). The 320px request walkthrough reached
all three steps and Enter focused the third heading; it was never submitted.
Tab from the visit request button focused the named message-history region.

The reusable `tests/browser-preview.mjs` now generates `qa.html` with these narrow
frames and a synthetic project/conversation. `tests/RESPONSIVE-QA.md` records the
procedure and limits. No real account, lead, upload, message, visit or email was
created. These are desktop narrow-frame checks, not touch-device, mobile Safari,
screen-reader or genuine sign-in/email-delivery evidence.

Published owner-private from Site source
`a03ac1a69d80a1eaa7e2b426b1985721ab49db88`; successful deployment
`appgdep_6ad96cf8d878819196f559e952798315`. Only production theme.css and
conversation.js were copied after matching both Site baselines to the branch;
no QA harness or mocked network code was published. No backend, schema, Auth
configuration, audience or contractor changed.

Next: review account-backed project session changes and complete physical-mobile,
screen-reader and genuine account/email walkthroughs when available. Actual abuse
enforcement and sender/redirect/delivery verification remain launch gates.

## Project refresh ordering and gallery safety (October 21 update)

The private project workspace now applies only its newest lookup result. Late
successes cannot overwrite a newer status/gallery or reopen the workspace after
a newer access denial; late failures cannot hide a successful newer refresh.
Starting a lookup also invalidates the photo freshness flag, preventing a new
upload from using an outdated gallery count while that lookup is pending.
This protects display ordering within the page; server authorization and photo
limits remain unchanged. It does not add cross-tab session synchronization.

Validation: **96 Node/DOM tests pass**, including five new deferred-response
regressions in `tests/project-photos-ui.test.mjs`. All five fail against the
previous implementation and pass with the fix. They cover stale success, stale
403/server errors, a newer access denial and uploads during a pending lookup.
`git diff --check` passes. No real project, message, upload, account or email was
created; this is mocked evidence, not mobile or screen-reader verification.

Published owner-private from Site source
`1c7862b5cd7f620a0959c2f6b424d2774d7b5f4f`; successful deployment
`appgdep_6ad95e4149088191aae11431fc21c23b`. The existing Site project.js matched
the branch baseline byte-for-byte before the tested change was copied.
No backend, schema, Auth settings, audience or contractor changed.

Next: mobile/project-workspace accessibility review with read-only fixtures and
review account-backed workspace session changes. Sender/redirect/delivery and
actual abuse-enforcement gates remain open for the December 1 review.

## Visit actions and reload recovery (October 21 update)

The shared conversation now serializes visit requests and decisions within its
mounted panel. All visit controls stay disabled while a mutation/reload is pending,
so Enter cannot replay a request with a changed date and company confirm/decline
buttons cannot issue conflicting simultaneous writes from the same panel.
A saved visit change followed by a failed reload is described explicitly, and
further visit changes stay blocked until a successful conversation refresh.
Reads started before a visit mutation cannot restore old visit controls afterward.
Failed request writes preserve date/time values and their retry key. A failing
project-status callback cannot misrepresent a saved visit as a failed write.
This is a client-panel guard, not cross-tab/server transaction locking. Existing
backend permissions and booking semantics remain unchanged: homeowners request a
preference; the company must confirm availability; no calendar is reserved.

Validation: **91 Node/DOM tests pass**, including six new mocked visit regressions
in `tests/visit-actions-ui.test.mjs`. These cover repeated request events, sibling
company decisions, saved-change/failed-read recovery, retry-key stability, stale
read suppression and callback failures. The failed-reload and stale-read tests
both fail against the old implementation. `git diff --check` passes. No real
visit, lead, message, account, email or calendar booking was created; no browser
or mobile verification is newly claimed by these DOM tests.

Published owner-private from Site source `74e8b6ef63f818e2bd9806ffc3e1030ae41a3e23`;
successful deployment `appgdep_6ad95160fdec81919d983cceb96036f8`. The prior Site
conversation file matched the branch baseline before copying the tested change.
No backend, migration, Auth configuration, audience or contractor changed.

Next: mobile/project-workspace accessibility review with read-only fixtures;
account/email delivery and actual abuse-enforcement gates remain open.

## Conversation send recovery (October 21 update)

The shared homeowner/contractor conversation now locks message submission while a
send and its refresh are pending, including repeated Enter/submit events. It clears
only the exact draft that was sent, preserving new text typed during a slow send.
A confirmed write followed by a failed conversation read explicitly says the
message is saved, asks for a refresh and warns against resending that saved message.
A failed write retains the draft and reuses its idempotency key on a deliberate retry.
The form exposes its pending state through `aria-busy`; backend access and message
idempotency rules are unchanged. This does not add email or SMS notifications.

Validation: **85 Node/DOM tests pass**. Four new mocked tests in
`tests/conversation-send.test.mjs` cover repeated submit while pending (including a
changed draft), preservation of new text, saved-write/failed-read messaging and
retry-key stability. The preservation and refresh regressions both fail against
the previous implementation. `git diff --check` passes. No real conversation,
message, visit, account or email was created. No new browser/mobile evidence is
claimed for this change; the prior desktop request-form evidence remains separate.

Published to the existing owner-private Site from source
`62ccd0d7e697d3fb1bf3e8418d8f25814ed24701`; successful deployment
`appgdep_6ad94392e5f48191a1ba4e1b8d51c410`. The prior Site conversation file was
compared byte-for-byte to the branch baseline before copying the tested change.
No backend, migration, Auth setting, audience or contractor activation changed.

Next: visit-action concurrency/reload feedback and mobile/project-workspace
accessibility review using mocks; genuine account/email and abuse gates stay open.

## Request keyboard navigation and validation (October 21 update)

The three-step homeowner form now treats Enter on the first two steps as Continue,
without attempting to create a project. Step changes focus a keyboard-focusable
heading and expose the current step/title through a progressbar. Final validation
reveals an earlier invalid step before focusing and reporting its field; photo
validation also focuses the selection control. Branding and routing are unchanged.

Validation: **81 tests pass**. Three new regressions cover early Enter, step focus
and accessible progress, and reveal-before-report validation. All three fail against
the previous code. Desktop Chromium QA in the managed preview confirmed loaded
service options, focus on second/third headings, Enter from ZIP advancing to contact,
and native required-name focus. This was a read-only local fixture: only a mocked
provider GET is allowed; all other fetches/writes throw. No contact values, consent,
real lead, upload, account or email were submitted. Mobile and screen-reader device
checks remain pending; desktop accessibility-tree inspection is not that evidence.

`tests/browser-preview.mjs` generates this fixture in an empty absolute scratch
folder under `/workspace/`; run it with `node painting-platform/tests/browser-preview.mjs
<absolute-preview-folder>` and use the Sites managed preview supervisor. Its generated
network stub and HTTP-only UUID compatibility shim must never be deployed. Only
production `request.html` and `request.js` were copied to the Site after comparing
the prior Site files byte-for-byte with the branch baseline.

Published owner-private from Site source `197020eee41496be7cfabc26f0c5b952fd22ea73`;
successful deployment `appgdep_6ad936404748819184e5b0152060acee`. No backend,
migration, Auth configuration, audience or participating contractor changed.

Next: mobile keyboard/layout and project workspace accessibility review using
read-only fixtures; genuine account/email and abuse-enforcement gates remain open.

## Account dashboard display isolation (October 21 update)

The homeowner dashboard now binds each load to its request generation and session
revision. Old cards and account identity are removed before a fresh identity check;
only the newest load for the unchanged session can render projects. Late successes
and failures from a previous account/load are discarded. Sign-in success copy also
waits for a current dashboard result rather than declaring success after a stale
load. A rejected session clears the prior display.

Sign-out immediately removes project cards, account identity, new-password input
and pasted project/email links before waiting for the server logout response. This
prevents a delayed logout or project fetch from leaving private account content in
the visible panel. Server-side project ownership and JWT validation are unchanged;
this fix addresses the client display, not immediate revocation of issued tokens.

Validation: **78 tests pass**, including seven new deferred-response DOM tests in
`tests/account-dashboard-races.test.mjs`: response after sign-out, account switch,
newer refresh ordering, old failure suppression, immediate local sign-out cleanup,
rejected session cleanup and pending identity isolation. The first six regressions
were run against the old implementation and all six failed. `git diff --check`
passes. No real sign-in, account, email, lead, password change or message occurred.

Published to the existing owner-private Site from source
`852813f8a55d75680bf9237987ebda1109b5f025`; successful deployment
`appgdep_6ad926e52e9081919bb0cd7886e3b9e0`. No backend, migration, provider or Auth
setting changed. `LAUNCH.md` records the updated evidence.

Next: browser/mobile and accessibility review of the primary homeowner journey.
Real browser review, native CAPTCHA enforcement and sender/domain/redirect/delivery
verification remain separate launch gates; simulated tests do not complete them.

## Recovery redirects and callback session checks (October 21 update)

Expired or invalid email redirects now show a fixed, actionable message instead
of silently opening a normal sign-in screen. Callback fragments are scrubbed from
the address before configuration requests, preserving the page's query. Duplicate,
incomplete and unsupported callback parameters are rejected; arbitrary error
text from a link is never echoed into the page.

Valid callback credentials still require a deliberate completion click. The
client now verifies the original access identity, exchanges the refresh token,
and verifies the renewed identity matches with a confirmed email before saving
that renewed session. A changed session revision while checking the link blocks
adoption of an older callback. Recovery-specific completion prompts the homeowner
to choose a new password and focuses that field; signup/email confirmation keeps
its own wording. Manual email-link verification and callback completion share
the existing auth-operation lock.

Validation: **71 tests pass**, including eight new mocked callback tests for
expiry/description handling, malformed parameters, early URL cleanup, explicit
completion, recovery/confirmation behavior, mixed identities, failed refresh and
newer sign-in protection. `git diff --check` passes. No real account, email,
sign-in, lead, message or password change was performed. These tests do not
establish SMTP delivery or a real cross-device browser journey.

The static fix is published to the existing owner-private Site from source
`9388f3de653b184aa5cacb29828c0bf89ed062a6`; successful deployment
`appgdep_6ad9192114548191b5384b7d033ef55d`. No backend, database or Auth-setting
changes were needed. `LAUNCH.md` records the behavior and remaining evidence.

Next: review late account-dashboard responses and browser/mobile accessibility.
Native CAPTCHA activation, sender/domain/redirect setup, actual email delivery
and a genuine browser walkthrough remain separate launch gates.

## Native Auth CAPTCHA client preparation (October 21 update)

Homeowner signup, password sign-in and recovery, plus contractor password sign-in,
now support the native Supabase Auth CAPTCHA protocol. The shared helper adds
`gotrue_meta_security.captcha_token` to those requests only, keeping proof separate
from profile metadata and session refresh payloads. Checks reset after each
attempt; homeowner sign-in/recovery share a lock and contractor sign-in rejects
duplicate submissions. Failed security-configuration lookup blocks new auth
attempts until refresh. Native CAPTCHA errors now give a useful retry message.

Provider discovery exposes a separate public `auth_challenge` configuration driven
by `AUTH_TURNSTILE_SITE_KEY`. It does not expose any native Auth secret and does
not assert that Supabase's native CAPTCHA enforcement is enabled. The actual
Auth provider/secret/toggle must be configured in Supabase Authentication settings.
Intake verification and native Auth verification are separate controls.

Validation: **63 tests pass**, with eight new tests covering sign-in/signup/recovery
proof, reset and failure handling, concurrent homeowner attempts, contractor
compatibility, disabled/unloaded helper behavior and public-key separation. No
real sign-in, account, recovery email, lead or message was created. Current Auth
CAPTCHA docs and the official auth-js request protocol were checked. No schema
migration, Auth settings or secrets were changed/read/exported.

Deployment: isolated `platform-api` version 7; existing owner-private Site source
`8e23bc8eb5ab8f13e129614d567457b7c2bfc823`, successful deployment
`appgdep_6ad90ad7d3948191beb717a942b5c1ad`. Read-only live provider lookup returned
200 with R Painters alone and `auth_challenge.required=false`/empty public key.
The new client support is deployed but **real native enforcement remains
unverified**. It is not a completed anti-bot or email-delivery launch gate.

`LAUNCH.md` now describes the correct activation order for both homeowner and
contractor access, including the secure native Auth setting and evidence needed.
Next: browser/mobile review and account recovery edge cases that can be exercised
without sending email. Sender/domain/redirect setup, actual delivery and genuine
CAPTCHA enforcement still need separate evidence before opening public access.

## Configurable intake abuse verification and launch review (October 21 update)

New painting requests and company-interest forms now support Cloudflare Turnstile
through an explicit `PLATFORM_REQUIRE_CHALLENGE=true` server setting. Verification
checks success, the exact submitting Site hostname and the form's action before
any intake RPC. Missing keys, verifier outages, invalid/expired/replayed tokens
and mismatched hostname/action are blocked when the feature is required. Only the
public widget key and availability flags appear in provider discovery. Challenge
tokens are not forwarded into project/interest records. The client clears expired
checks and obtains a fresh check for a create retry while retaining its existing
request UUID/private key. Privacy copy describes the optional external check.

**Prepared and deployed, not activated.** The isolated API is now version 6 and
the existing owner-private Site was deployed from source commit
`bc08cdc41a1854ea897ce17df078022fefce2bf0` (deployment
`appgdep_6ad8fc6c5dfc8191b28b8103889165aa`). A read-only live provider lookup returned
200, only `r-painters-llc`, and `intake_challenge.required=false`. No keys or
settings were retrieved/changed, no external verifier was contacted by tests and
no account, customer lead, photo, email or message was created. Backend source
matched the branch before replacement; guest JWT gateway behavior is preserved.
No migration was needed.

Validation: **55 Node/DOM tests pass**, including 12 new checks for verification,
replay/outage/host/action rejection, configuration secrecy, widget expiry/reset
and protected request retries. `git diff --check` passes. Real widget behavior,
public bot protection and email delivery are not proved by these mocks.

`LAUNCH.md` now records the December 1 review gates, exact secure configuration
steps and evidence still needed. The owner must create a restricted Turnstile
widget and enter its public and secret keys in the isolated Supabase Edge Function
settings, then enable the requirement. Never paste a secret into chat or source.
This covers intake only; direct Supabase Auth signup/recovery needs its own abuse
protection and client integration before launch. The current Site stays private.

Next: prepare Auth abuse protection and account browser verification without
sending email. SMTP sender/domain, redirects, genuine email-delivery evidence and
mobile walkthroughs remain separate launch gates. Security advisors were reviewed;
the remaining leaked-password-protection warning and informational deny-client
RLS findings are recorded with their limits in `LAUNCH.md`.

## Partial photo upload recovery (October 21 update)

The project-page uploader now attempts each selected photo independently, counts
confirmed and unconfirmed uploads, clears the attempted selection and refreshes
the saved gallery even after partial failure. A failed response may still mean
that the photo was saved, so the homeowner is directed to check the gallery and
select only missing photos. No photo is automatically retried. Double submission
is blocked and the file picker is disabled while the current batch runs. Empty,
invalid and over-capacity selections are rejected before any upload starts.

The API helper preserves HTTP error status for access-aware recovery. A transient
lookup failure retains the last loaded workspace and private link with a stale
information notice; additional uploads stay blocked until lookup succeeds.
401/403/404 lookup failures hide the workspace instead. Account uploads still use
the signed-in bearer session and do not manufacture a guest key.

Validation: **43 Node/DOM tests pass**, with seven new mocked project-photo
journeys in `tests/project-photos-ui.test.mjs`. They cover partial success,
response loss after a save, failed gallery refresh and recovery, access denial,
double-click protection, size/capacity checks, and account-owned upload headers.
`git diff --check` passes. No real lead, account, email, photo upload or message
was created; no backend, schema or storage permissions were changed. These are
mocked behavior checks, not a real browser/mobile or live-storage walkthrough.

Published successfully to the existing owner-private Site on October 21 from
source commit `30d0ebfde1cd7ff24d200ec3402342482230873a`; deployment
`appgdep_6ad8efa8d51c8191a7564e91e6bd00d5`.

Next: prepare public abuse protection and an owner-reviewable launch checklist.
Email sender/domain, allowed redirects, actual confirmation/recovery delivery and
browser/mobile walkthroughs remain launch gates. Upload retries across page
reloads are not server-idempotent; homeowners must inspect the gallery before
manually adding missing photos.

## Immediate request receipt and optional-step recovery (October 21 update)

After the create API confirms the saved project, the request page immediately
shows a focused receipt with its private link, copy control and an **Open project**
link in another tab. The request form stays hidden and cannot be submitted again.
Photos continue uploading in the original tab, with progress and a reminder to
keep it open. The receipt explicitly names R Painters as the pilot participant
and distinguishes a free estimate request from a booking. No automatic email
delivery is claimed, and the private key is not automatically remembered.

Photo failures and account-link failures retain the saved receipt and access link;
account-link errors now explain how to recover from the project workspace. Photo
responses lost in transit are described as unconfirmed: check the saved gallery
before adding missing photos. A failed create still permits a retry using the
same request UUID and private key for the existing server idempotency check.
The page no longer automatically redirects after optional work finishes; the
homeowner can copy the link immediately and open the project without interrupting
the original tab's uploads. Closing the original tab can interrupt uploads, and
page-reload recovery of an unconfirmed create is not implemented.

Validation: **36 tests pass**, including four new mocked DOM journeys in
`tests/request-ui.test.mjs`: receipt during a stalled photo upload, duplicate
submit protection, partial upload plus account-link failure, create retry with
unchanged keys, and no-photo account linking. The duplicate-submit assertions
are part of the slow-upload test. Copy fallback, consent forwarding, private-link
fragments and no automatic navigation are also covered. `git diff --check` passes.
No real lead, account, email, upload or message was created during verification.
No backend or migration changes were needed. Mobile visual and real browser
walkthroughs remain unverified.

Published to the existing owner-private Site from source commit
`b5f5fcd2e1f8922bca35d8f96deaf90a18ee751b` on October 21; successful deployment
`appgdep_6ad8e09049508191b2bed9563621745d`.

Next: review partial-upload recovery on the project page and prepare public
abuse protection. Sender/domain setup, allowed account redirects, actual email
delivery and browser/mobile walkthroughs remain launch gates.

## Homeowner session concurrency fix (October 21 update)

Homeowner requests for an expiring session now share a single refresh. Session
revisions prevent a delayed refresh or user lookup from restoring a signed-out
session, replacing a newer login, or clearing a newer login after an old failure.
Sign-out clears tab storage immediately without waiting for a refresh; the
existing server logout remains best-effort. This is client session lifecycle
hardening, not a claim of immediate revocation of every already-issued JWT.
Contractor sessions, database permissions and the isolated API are unchanged.

Evidence: `npm test` passes **32 tests**, including eight new mocked session
regressions in `tests/auth-session.test.mjs`. They cover simultaneous refresh,
sign-out during refresh, successful/failed stale refresh, successful/failed stale
user lookup, failed shared refresh and sign-out before a user lookup starts.
The first seven regressions were also run against the previous implementation:
six failed, confirming they detect the concurrency bugs. `git diff --check`
passes. No real sign-in, email, lead submission or customer message was sent.
No schema migration was needed. The static fix was published successfully to
the existing owner-private Site from source commit
`003a14e8b4c3fefb0bae5acd597bdb8c5490e560` on October 21. Deployment:
`appgdep_6ad8d31c65788191b84ff6ae4c7bab45`.

Next: review request/photo error recovery and enforce public abuse protection
before opening access. Real confirmation/recovery delivery, sender/domain setup,
allowed redirects and mobile/browser walkthrough remain unverified launch gates;
this update does not complete them. Sender setup requires the owner's approved
sending domain/address and configuration in Supabase Auth; credentials must be
entered through the provider's secure settings, never committed here.

## Contractor inbox and approved brand (October 21 update)

The brand is **BUZZIE — Find Your Local Painter**, with discreet **by R Painters**,
the approved dog logo, forest-green backgrounds and pearl-white lettering. The
homeowner pages explain that the local pilot assigns eligible requests to one
participating company, rather than implying a live multi-contractor comparison.
Requesting an estimate is free; submitting does not book painting work.

The contractor dashboard now has name/service/location/contact search, project
status and team-review filters, newest/oldest order, metrics for the latest 100
loaded projects, private internal notes and manual qualification. A review can
be needs-review, qualified-by-your-team, or not-a-fit. It is not independent
contact verification, a billable qualification decision, or a booking guarantee.
Notes and reviews use their own deny-all client table and are returned only by
the membership-scoped contractor API; homeowner lookup never selects them.
Optimistic revisions reject stale saves without replacing newer notes.

Business owners can pause/resume new requests. Staff can manage project reviews
but cannot change intake availability. Both membership and project scope are
checked in the API and server-only invoker RPCs. Pausing removes a provider from
new discovery/routing while preserving existing requests, conversations and retry
idempotence. Provider activation and coverage editing remain managed pilot tasks;
this dashboard does not activate a nationwide paid contractor network.

Validation: 24 Node/DOM tests pass. Transactional SQL checks in
`tests/contractor-controls.sql` passed unauthorized review denial, revision
conflicts, staff availability denial, paused-provider assignment rejection and
existing-request retry preservation. All synthetic changes roll back. No real
customer was contacted, and no fake production-site lead was submitted.
Public SMTP/confirmation delivery, bot protection and real browser walkthrough
remain launch gates. Contractor sessions stay in memory and refresh while the
page is open; contractor and homeowner sessions are kept separate.

## Homeowner accounts (October 20 update)

`account.html` adds email/password registration, sign-in, confirmation/recovery
handling, password changes, sign-out and an account project dashboard. A project
can be linked only by providing its original private key and a confirmed account
email matching the request. Matching an email alone grants no access. Linked
projects reopen with server-validated JWT ownership, including photos, messages
and site visits; account project URLs contain no guest access key. The original
guest capability link remains valid. Signed-in request creation attempts to link
the saved project, but a failed linking step never turns a saved request into a
failed submission. The homeowner can retry from the project or account page.

Sessions use tab-scoped sessionStorage; access tokens refresh and local session
state clears on sign-out. Only server-fetched confirmed Auth identities authorize
account access. The server-only claim RPC checks the confirmed auth user, request
email, capability and current ownership while holding the project row lock. Its
narrow SECURITY DEFINER access is necessary because service_role cannot directly
read auth.users; public/anon/authenticated EXECUTE remains revoked. No direct
client table privileges were added. Homeowner registration does not activate
contractor membership or expose anyone else's projects.

**Public registration is not launched.** Email confirmation remains enabled.
Production SMTP sender/domain, allowed confirmation/recovery redirects and delivery
testing are still required. An account page can also verify the original Supabase
confirmation/recovery URL explicitly, avoiding reliance on an unconfigured redirect.
No fake public account was registered and no confirmation email was sent during
validation. The existing owner's password was not accessed or changed.

Validation: 19 Node/DOM tests pass. Rollback SQL tests passed incorrect-key denial,
mismatched-email denial, unconfirmed-email denial, repeat linking and prevention
of ownership reassignment. `tests/accounts.sql` reproduces those checks in the
isolated pilot and rolls back its synthetic records. Real email delivery and
cross-device browser sign-in remain launch review items.

Private pilot: https://r-painters-projects.jessicuriel27.chatgpt.site

This app is distinct from the existing discovery dashboard. It accepts homeowner
painting projects, routes them to the active local provider, stores private photos,
shows project progress through a private access link, and gives approved business
members their own assigned-project workspace. R Painters LLC is the only active
provider in the Charleston/Summerville pilot. Other US businesses can register
interest; that does not activate an account or promise leads.

## Try the pilot

1. Open the private pilot while signed into the owning ChatGPT account.
2. Choose **Start a project**, use a covered city and ZIP, and clearly label any
   test request. Save the private link shown after submission. Sharing it grants
   access to that project's contact details and photos. **Remember on this device**
   is optional and stores that key in the browser.
3. Open `pro.html` from the business workspace link. Sign in with the existing
   R Painters Supabase account (`rpaintersinsc@gmail.com`) and its existing password.
   Change the sample project's status, then refresh its homeowner page.
4. The owner can also review painting-company expansion interest in that workspace.

## Source and deployment

`web/` is the static application; copy it to the Site's configured `dist/` directory.
`supabase/migrations/` contains the applied schema changes. `platform-api` is deployed
to the isolated lead-engine Supabase project. Apply migrations before deploying
the function. No service-role key or sending credential belongs in the web files.
The public publishable key is intentionally public.

The function validates guest project capabilities itself and validates business
JWTs with Supabase Auth before checking membership. Its gateway JWT requirement is
off so guest project routes can work. Database tables and RPCs deny direct anon and
authenticated access; server-only calls enforce routing and business scope.
Photos use a private bucket and signed 30-minute access URLs. Guest access is not
an email-verified homeowner account. Backend origin checks are browser restrictions,
not protection against a non-browser attacker. Atomic pilot request/photo limits
are additional controls, not a substitute for production bot protection.

Request creation writes the existing lead outbox transactionally. The existing
notification worker sends generic owner alerts; homeowner email delivery and
verified transactional sender setup remain future work. No private alert feed URL,
service credential, or project access token is stored in this source.

## Validation on 2026-10-17

`npm test` passes eight tests covering origin rejection, authentication, foreign
membership denial, private capability requirements, input/body limits, provider
interest scope, and local HTML asset references. `tests/live-pilot.mjs` is a manual
live integration test; it creates a clearly marked synthetic project and therefore
is not run by the default suite. It passed actual routing, duplicate prevention,
private lookup, incorrect-key denial, photo upload and signed-image retrieval.
The synthetic project's ID is `3694c46e-45a3-40c9-8c3d-dc9159eb61ac`.
Rollback-only database assertions passed foreign-business status rejection,
status-event creation, wrong-key photo rejection, five-photo limits, and revoked
anonymous RPC access. The private bucket and owner membership were verified.

No browser automation is available in this environment. Responsive visual review,
real password sign-in, and the full owner-facing browser walkthrough still need
review. API and database checks do not replace that walkthrough.

## Public and national launch gates

### Project conversation and site visits (October 17 update)

Homeowners can now send messages and propose a visit date/time window from their
private project page. Approved business members open **Messages & site visit** on
the project card to reply, confirm or decline. Homeowners can cancel a requested
or confirmed visit. These updates are stored inside Buzzie; there are no automatic
email/text alerts for replies or visits, and users refresh to check for updates.
There is no external calendar reservation or exact arrival-time guarantee.
Dates/windows use America/New_York for the Charleston pilot. Confirming a visit
advances new/contacted projects to visit_scheduled; cancelling a confirmed visit
returns that stage to contacted, without reversing quoted/booked/closed projects.

Messages are plain text, at most 2,000 characters, capped at 40 per side per project
per day and 500 overall. The thread shows the latest 100. Visit preferences are
limited to the next 180 days, ten requests per project and one open visit at a time.
Writes are serialized on the project and retries use client request keys.
The server derives the sender from the project capability or verified business
membership; clients cannot declare their own author identity. New tables deny
direct client access, and the service-only invoker RPC rechecks project scope.

Thirteen tests pass, including DOM tests for safe message rendering and form
wiring, foreign-project denial, sender spoof prevention and homeowner confirmation
denial. Rollback database checks exercised message retries, visit confirmation,
cancellation and status history. The manual live test now covers messages and
visit requests too. Browser visual review and real business sign-in are still
separate review items.

Keep the Site owner-private until the homeowner and business browser journeys are
reviewed, production bot protection is enforced, and the public brand/domain and
transactional sender are configured. National expansion additionally needs provider
verification, activation and coverage administration, homeowner account recovery,
matching rules, complaint/review moderation, billing if sold, and operating support.
There are no invented reviews, verified-contact claims, nationwide coverage claims,
or guaranteed lead volume. The code and project data live in the owner's accounts;
hosting, email, storage and acquisition can incur usage costs as volume grows.

After public launch the platform needs customer acquisition and promotion. External
discovery feeds remain a separate channel and their posts are not automatically
represented as consenting platform customers. The original production website and
repository main branch are unchanged by this pilot.

