# Account-only conversation session evidence — October 23, 2026

`conversation.js` uses `sessionSnapshot` only for homeowner access without a
private capability key. Loaded data retains its snapshot. Reads and writes check
acquired snapshots at dispatch and response boundaries, including the caller's
post-await boundary. A write from a stale loaded view stops before dispatch.
Refreshing under a different session clears the old private view before loading.
A stale success or error retires thread, draft and visit controls; a fresh
successful read permits deliberate action again.

## Reproduction and results

Run `npm ci --prefix painting-platform`, then
`npm run verify --prefix painting-platform` with Node 24.
The full verifier links 12 browser modules and passes 336 mocked Node/DOM tests.
`tests/conversation-session.test.mjs` adds 13 cases:

- Late read success/error across logout and replacement login.
- A stale loaded thread cannot dispatch a message under another account.
- Pending message and visit request/update results cannot claim current success,
  reveal old content or invoke a stale visit-success callback.
- Logout during token acquisition prevents message dispatch.
- A fresh authorized read recovers controls and permits sending.
- Positive controls preserve normal renewal before snapshot acquisition,
  independent capability access and contractor token-provider behavior.

The suite fails ten cases with only conversation.js replaced by the preceding
GitHub HEAD version; the three positive controls pass. The corrected module
passes all 13. All fetch responses, tokens, identities, messages and visits are
synthetic. No live Auth/database/intake endpoint or recipient was contacted.

## Limits and next review

Already-dispatched writes may complete on the server. The UI requests a fresh
read and checking the saved result before retrying; no cancellation or rollback
is claimed. No global idle/cross-tab logout observer was added. The contractor
session lifecycle remains unchanged; its positive control proves compatibility,
not a complete contractor session audit. Capability-key access remains independent
of account login. Full authenticated browser/JWT isolation, genuine delivery,
physical devices and screen readers remain separate launch gates.

Next review: detached/replaced conversation panels and their pending responses
or retained event handlers. This change tests session boundaries, not that
separate lifecycle. No optional feature or server authorization change is included.
