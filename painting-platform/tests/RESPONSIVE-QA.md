# Read-only responsive QA

Reviewed October 21, 2026 with desktop Chromium and the branch's production files.
This fixture runs only locally. Never deploy its output: it replaces network
responses with synthetic data and includes an HTTP UUID compatibility shim.

Generate into an empty absolute scratch folder under `/workspace/`:

```sh
node painting-platform/tests/browser-preview.mjs /workspace/buzzie-responsive-qa
sites-preview start /workspace/buzzie-responsive-qa
```

In the managed browser open `http://terminal.local:4173/qa.html`. Use the nine
labeled page/width links; the frames preserve the actual production media queries.
The generated fetch stub returns only provider discovery and synthetic project and
conversation reads on the exact isolated API path. All other fetch requests throw,
including account requests and all writes. Do not click Remember on this device
or Copy private link: these contain fixture credentials, not a real project.

| Check | Observed result |
| --- | --- |
| Project at 320px with a long unbroken email | Before fix: 591px document for 305px usable width. After fix: document and usable width both 305px. No horizontal overflow. |
| Request/project/signed-out account at 390px | Document and usable width both 375px after vertical scrollbar. No horizontal overflow. |
| All three pages at 768px, including fully loaded project | Document and usable width both 753px after vertical scrollbar. No horizontal overflow. |
| Request and signed-out account at 320px | Document and usable width both 305px. No horizontal overflow. |
| Request steps 1–3 at 320px | Service/details, then city/timing/ZIP advanced normally; Enter from ZIP reached step 3 and focused its heading. Steps 2 and 3 remained 305px wide. Contact inputs and consent were left empty; no final submit. |
| Message history keyboard access | Tab from Request a site visit focused `.message-thread`; snapshot exposed named region Project messages. No visit or message sent. |

The 15px difference between frame width and usable width is the desktop vertical
scrollbar. These are narrow-frame layout and keyboard checks, not mobile device
emulation. Actual touch keyboards, file pickers/uploads, iOS/Safari, screen-reader
announcements, real sign-in, email links and live delivery still need review.
No customer-facing data, account, upload, message or visit was created.

Automated boundary checks run with `npm test --prefix painting-platform` and do
not call a remote API. Stop the managed preview after inspection:

```sh
sites-preview stop
```
