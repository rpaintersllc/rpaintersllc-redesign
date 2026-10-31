# Synthetic account browser review

Reviewed October 22, 2026 using desktop Chromium and the production account
HTML/JavaScript/CSS from this branch. This is a local fixture, not a real account
or proof of Supabase Auth enforcement/delivery. Never deploy its generated output.

From the repository root, use a new empty scratch directory under `/workspace`:

```sh
node painting-platform/tests/account-browser-preview.mjs /workspace/buzzie-account-qa
sites-preview start /workspace/buzzie-account-qa
```

Open `http://terminal.local:4173/qa.html` in the managed browser. The page labels
the simulation and offers signin, signup, signup-session, signup-rejected,
confirmation, recovery, expired, list-failure and auth-failure scenarios at 320, 390 and 768px. The actual application modules are
copied unchanged. Network substitution loads before account.js and clears only
the fixture origin's Buzzie session at page load. Use only synthetic values, such
as `homeowner@example.invalid` and a disposable non-secret password-shaped string.
Never enter real credentials, customer links or contact data.

The account document and wrapper use CSP `connect-src 'none'` and
`form-action 'none'`. The fetch stub returns synthetic results only for the exact
isolated API origin and declared methods/paths. Other operations throw; it never
falls back to real fetch. XHR, WebSocket and EventSource constructors throw, and
sendBeacon returns false. Mock claim/password/recovery operations do not persist
or dispatch anything. The QA call log records only method/path/action, never
bodies, passwords, tokens or query strings. The original responsive fixture
remains read-only and unchanged.

| Browser check | Observed evidence |
| --- | --- |
| Sign in using Enter from the password field | Synthetic identity and project card appear; no real authentication occurs. |
| Signed-in account at 390px before CSS fix | 440px document width versus 375px usable width; account email heading overflows. |
| Signed-in account after CSS fix at 320/390/768px | Document and usable widths match: 305/375/753px. Header email wraps within the panel. |
| Recovery at 390px | Finish password recovery activated with Enter; success guidance appears and `new-password` receives focus. No password saved. |
| Expired link at 320px | Fixed expiry guidance; no callback finish button; 305px document/usable width. |
| Auth failure at 390px | Unable to sign in guidance; 375px document/usable width. |
| Project-list failure at 390px | Unable to load your projects / Refresh guidance; 375px document/usable width. |

The 15px difference between selected frame width and usable width is the desktop
scrollbar. This is narrow-frame testing, not a physical phone or touch keyboard.
The initial review did not walk through signup. The follow-up below now covers
the selected synthetic signup outcomes. Real email links, CAPTCHA enforcement, server-side
cross-account access, screen-reader announcements, physical devices and Safari
remain separate gates. The October 22 focus follow-up now moves from password Enter or keyboard activation
of Sign in to the visible account heading, then Tab reaches Refresh projects. This
was checked in Chromium at 390px (password Enter) and 320px (button Enter). Recovery
at 390px still focuses new-password. A programmatic tabindex=-1 keeps the heading
out of the normal Tab sequence. Mocked tests also cover preserving a user focus
change during Auth/identity lookups, manual-refresh focus and logout races.

Three automated fixture-boundary tests check the declared responses, rejected
origins/methods/transports, failure scenarios, CSP and unchanged copied account.js.
They run with `npm run verify --prefix painting-platform`; all 197 tests pass.
No customer account, password, request or email was created/changed by this review.
Stop the managed preview when finished:

```sh
sites-preview stop
```


## Signup / confirmation follow-up — October 22

Added three fixture scenarios while retaining the exact-origin/method allowlist,
CSP, blocked alternative transports and credential-free call log. Signup-session
returns a synthetic immediate session; signup-rejected returns 403/signup_disabled;
confirmation supplies only synthetic URL credentials and still requires the
production Finish email confirmation button. No real account exists or is created.

| Desktop Chromium path | Observed result |
| --- | --- |
| Signup 320px, valid fields, no consent, Enter | Native checkbox-required feedback; focus reaches consent. |
| Signup 320px, consent checked, keyboard submit | Returns to Sign in with conditional inbox wording, not a delivery assertion; document/usable width 305px. |
| Signup-session 390px, five-character keyboard input | Native instruction requires at least 12 characters; submission blocked. Direct programmatic fill is not used as evidence of native minlength enforcement. |
| Signup-session 390px, valid keyboard input and consent | Synthetic account/project appears; focus moves to account heading, then Tab reaches Refresh projects; width 375px. |
| Signup-rejected 768px | Registration error appears; signup form/input retained and submit enabled for a deliberate retry; width 753px. |
| Confirmation callback 320px before fix | Deliberate Finish email confirmation succeeds, button disappears and focus falls to the document. |
| Confirmation callback 320px after fix | Heading receives focus after success; next Tab reaches Refresh projects. No session adopted before the deliberate action. |
| Manual synthetic signup link at 390px after fix | Enter from the pasted-link field focuses the visible account heading after confirmation. |

The production fix passes fourteen mocked focus checks; five fail against the
preceding account.js. They additionally cover focus changes during verification
and account-list reads, stale logout results, list failure, disabled-button blur
and preserving a newer link draft. Recovery's existing focus tests still pass.
Two new fixture boundary checks verify signup variants and synthetic confirmation
without logging request bodies or credentials. The complete verifier now passes
**243 tests** and links **12 browser modules**.

Only production account.js was published owner-private from Site source
`cd0abb149687f1e64720d08604f804d1b52c90b9`; deployment
`appgdep_6ada88af89888191abdb26fd952f121e` succeeded. The hosted baseline matched
GitHub before replacement. The generated fixture was not published and preview
was stopped. No backend/Auth setting or real account/email/password changed.

These browser paths are selected serial synthetic outcomes. They do not prove
actual signup/confirmation/recovery delivery, CAPTCHA enforcement, concurrent
real sessions, physical-device behavior or screen-reader announcements. Existing
native form validation is browser behavior; no new server password policy was
implemented or inferred here.


## Recovery focus ownership — mocked follow-up

October 22: recovery completion now retains another control selected during
verification/account-list loading and a newer recovery-link draft, while ordinary
manual/callback completion still focuses new-password. Ten new mocked cases pass;
five fail against prior account.js. Logout and failed loads cannot focus hidden
password controls. Existing confirmation and recovery cases continue to pass;
the full verifier links 12 browser modules and passes 253 tests.

This follow-up adds **mocked evidence only**; no new browser, physical-device or
screen-reader walkthrough was performed, and no genuine Auth/email/password
mutation was made. Only tested account.js was published owner-private from Site
source `76bddc67071bbdc161b261abbd5f004f5ff0f22c`, successful deployment
`appgdep_6ada94a76928819185865ead80c47a41`. No fixture was deployed and no backend
or Auth configuration changed. Prior browser observations above remain separate.
