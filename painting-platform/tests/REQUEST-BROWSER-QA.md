# Synthetic request browser QA

Reviewed October 22, 2026 in desktop Chromium against branch baseline `6314bb1`.
This work changes fixture tooling and documentation only; production modules
are copied byte-for-byte and are not changed or deployed.

## Replay locally

Use Node 24 and a fresh scratch target under `/workspace/`:

```sh
node painting-platform/tests/request-browser-preview.mjs /workspace/buzzie-request-qa
sites-preview start /workspace/buzzie-request-qa
```

Open `http://terminal.local:4173/qa.html` in the managed browser. Select one of
success, partial or create-retry at 320, 390 or 768 px. Fill example.invalid
contact details and synthetic project text. On step two, the deliberately
fixture-only **QA: select two synthetic photos** button fills the file input
using browser File/DataTransfer objects and invokes its real change handler.
The bytes are synthetic headers, not real decodable photos; no object reaches
Storage. Never deploy this directory or copy its qa-network.js into the Site.
Stop the local preview with `sites-preview stop` when finished.

The fetch stub answers only provider GET and create/upload POST at the declared
API origin/path. All replies are synthetic; the stub never calls native fetch.
All Auth, Storage, claim, message and visit routes are rejected. A CSP with
`connect-src 'none'` and `form-action 'none'` precedes the stub; XHR, WebSocket,
EventSource and sendBeacon are blocked. Endpoint counters record only method,
path and action, never bodies, contact fields, private keys or file content.
The wrapper reports document/scroll widths, current focus and synthetic call
counts. It clears the local homeowner session so no account operation is needed.

Five Node tests verify declared replies, independent scenario counters, denied
routes/transports, production-module equality/CSP ordering and UUID compatibility
on the plain-HTTP managed preview origin. The complete verifier links **12 browser
modules and passes 268 mocked Node/DOM tests**. These tests validate the fixture
and existing application logic; they do not prove backend upload behavior.

## Observed journeys

All form actions below used the production request.js/common.js/auth-session.js
with the synthetic stub. Each scenario began with a new page and fresh counters.

| Scenario | Frame | Observed result |
| --- | --- | --- |
| Partial photos | 320 px | Two synthetic files selected through the input change handler; receipt stayed visible; one photo was unconfirmed; Open project included photos_failed=1; guidance asked to check saved photos before adding missing ones. Receipt received focus and the next Tab reached Open project. The screenshot showed the private link wrapping inside the panel. |
| Failed create, then retry without photos | 390 px | First save showed the synthetic error, preserved all fields/consent and re-enabled Back/submit. Second save showed the receipt and add-photos-later guidance. Counters: two create calls, zero uploads. Receipt document/scroll widths both 375 px. |
| Successful photos | 768 px | One create call, two synthetic uploads, “All 2 photo(s) uploaded.” Receipt received focus. Document/scroll widths both 753 px. Copy private link showed its manual-copy fallback in this plain-HTTP browser. |

This review did not traverse the Open project link, run a genuine signup/claim,
inspect actual stored photo bytes, or verify clipboard success. The existing
request-ui.test.mjs separately checks that a receipt appears before a deferred
upload completes and retries preserve request/private keys. Existing project
photo tests cover gallery recovery; those are distinct from this browser review.
Narrow desktop frames do not emulate physical phones or screen readers.

## Confirmed follow-up

After the first synthetic create failure at 390 px, focus was BODY (the document)
even though submit became enabled again. The error text was visible and retry by
click succeeded. This is a keyboard-recovery gap, not a saved-request failure.

Next bounded correction: return keyboard focus to an appropriate visible retry
control after an unsaved create failure only when the initiating control still
owns focus; preserve another field chosen during the pending request. Add
failure/race regressions and repeat this synthetic browser check before publishing.

No real request, upload, account, email, contractor, Supabase schema/runtime or
Site source/audience changed. Email delivery, real Storage failure/cleanup,
actual CAPTCHA enforcement, authenticated browser isolation and physical-device/
screen-reader evidence remain separate December 1 review gates in LAUNCH.md.


## Failed-create focus correction — October 22 follow-up

The preceding BODY-focus finding is now fixed in production request.js. A failed
unsaved request restores the re-enabled submit button only if it initiated the
operation and no newer focus choice occurred. A document focusin listener tracks
choices during the attempt and is removed in finally. Another field/link, or a
newer control that later blurs, keeps ownership; Enter from an editable field
stays there. Successful receipts still focus the receipt normally.

Eight mocked request UI cases cover retained submit focus, disabled-button blur,
a newer field, newer-field-then-blur, editable-field Enter, no initial focus,
successful receipt and a later deliberate retry. Three fail with the previous
module; all pass with the fix. Full verifier: 12 modules linked, 276 tests pass.

No fresh browser success is claimed: the first managed preview navigation ran
before startup finished and was refused; after startup the browser rejected
observation of the error-page tab under its URL policy. No alternative browser
surface or bypass was attempted. The preview was stopped. Repeat the corrected
390px failure/retry keyboard path when supported observation is available.

Only production request.js was deployed to the existing owner-private Site:
source dc90ae7d7994ec7dd618bfece9b4f44bd9888b45; successful deployment
appgdep_6adabe552ae48191b445168421b31d8b. Baseline hosted web files matched GitHub
before the change; no fixture/network stub was published. Supabase, real data,
contractors, notifications and audience were unchanged. Next inspect focus and
newer edits during a slow successful save, after repeating this browser check.


## Late account-prefill correction — October 22 follow-up

A code review of pending form edits found unconditional name/email assignment
when currentUser finished. A slow response could replace a newer contact draft.
Request.js now records input/change events from initialization and fills only
untouched empty fields, skipping a saving or saved form. Existing values, including
browser autofill, are preserved without requiring an event. Per-field listeners
are removed after lookup completion. Existing session-revision protection in
currentUser continues to reject identities from logout/replaced sessions.

Ten deferred-response Node/DOM cases pass; six fail against prior request.js:
normal hints, independent email/name edits, typed-then-cleared fields, browser-
filled values without events, logout, replacement login, save in progress,
completed receipt and identity-read failure. Full suite: 286 tests, 12 modules
linked. These are synthetic tests, not a new Chromium walkthrough or genuine
Auth request. Metadata is used only as a form hint, not contact verification,
account ownership, contractor assignment or authorization.

Only production request.js was deployed owner-private after hosted baseline
comparison: source d8b0ad36a2a389f7e148e91145c5a13013240b7e; successful deployment
appgdep_6adacd0843588191a20989da31ab60f4. Tests/fixtures stay out of the Site.
No real account, intake, photo, message or email changed. Next review slow-save
contact edits together with optional account-link feedback, and repeat corrected
keyboard journeys when supported browser observation is available.


## Request account-link session correction — October 22 follow-up

Review found that automatic claim used whichever session was present after
saving and uploading photos. It could dispatch under a later login, or report
“Project linked to your homeowner account” after the claim's initiating session
had already ended. Request.js now snapshots the client session revision at submit,
checks it before/after token acquisition and after claim completion, and gives
unconfirmed-link guidance when it changes. The project receipt and photo result
remain usable. An unchanged valid session retains automatic linking.

This guard intentionally treats token renewal as a session change, even for the
same account. In that case the homeowner checks or retries linking from the
private workspace and confirmed account. Server claim ownership/email rules are
unchanged. Once a claim has been dispatched, the UI cannot undo or cancel it;
a stale reply is evidence of an uncertain current-session result, not proof that
no server write happened.

Eight deferred-response tests all fail against preceding request.js and pass
with the fix: logout/new login during create, login during a guest save, replacement
session during a photo upload, late claim success after logout/new login, late
claim failure after replacement login, and token renewal before dispatch. Existing
positive unchanged-session linking and saved-receipt tests pass. Full verifier:
294 tests, 12 modules linked. No genuine account/claim/request/photo/email or new
browser walkthrough was performed. Cross-tab session propagation and real
server-side claim cancellation are not established by these mocked tests.

Only production request.js was published owner-private: source
c9357941980f56ee1cef37c3129cc3e7fa962fe4; successful deployment
appgdep_6adadbea59088191886d7eebe9787f10. Hosted baseline matched GitHub before
editing; no fixture was published or backend setting/contractor/audience changed.
Next review project-workspace link/refresh feedback with isolated session races;
repeat the corrected browser keyboard flows when supported observation is available.
