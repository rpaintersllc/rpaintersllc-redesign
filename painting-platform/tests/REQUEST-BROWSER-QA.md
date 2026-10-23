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
