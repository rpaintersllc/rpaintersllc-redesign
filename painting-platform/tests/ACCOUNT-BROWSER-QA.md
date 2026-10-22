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
the simulation and offers signin, signup, recovery, expired, list-failure and
auth-failure scenarios at 320, 390 and 768px. The actual application modules are
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
The signup scenario is prepared but its complete browser walkthrough was not
performed in this review. Real email links, CAPTCHA enforcement, server-side
cross-account access, screen-reader announcements, physical devices and Safari
remain separate gates. Sign-in currently leaves focus on the document after its
form is hidden; review deliberate dashboard focus as a follow-up.

Three automated fixture-boundary tests check the declared responses, rejected
origins/methods/transports, failure scenarios, CSP and unchanged copied account.js.
They run with `npm run verify --prefix painting-platform`; all 190 tests pass.
No customer account, password, request or email was created/changed by this review.
Stop the managed preview when finished:

```sh
sites-preview stop
```
